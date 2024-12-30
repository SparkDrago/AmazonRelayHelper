// ==UserScript==
// @name         Amazon Relay Notifications Fetcher
// @namespace    http://tampermonkey.net/
// @version      Beta-V0.6-(19/12/2024)
// @description  Display custom notifications on Amazon Relay dashboard
// @author       SparkDrago, Yamazo, StarkTheGnr
// @match        https://relay.amazon.com/hos?ref=owp_nav_hos
// @icon         https://lh3.googleusercontent.com/AIuLy2qRt1BgjSQRgCw-GeEDxKrh8UeMtJs25HH-Z7cMfnd8NkM6gFdExO_2WEpRp_U=s180
// @grant        GM.xmlHttpRequest

// ==/UserScript==
"use strict";
//TODO: Add a way to save (INTRANSIT) CsrfToken of the session to local storage. so only one visit to Amazon Realay is needed, as it won't work on other pages whose CSRF id different.
//Cookies:
const Cookie = document.cookie;
const allStoredNotes = JSON.parse(localStorage.getItem('ALLNOTES')) || {};
let assetMap = new Map();
let relayToken = null; // Initialize relayToken as null
let tokenExpiration = null; // To store the expiration time
let calculateLiveETAEnabled = false;
//let CompanySCAC = null;
//Functions:

/**
 * Gets the CSRF token from the <meta> tag with the name "x-owp-csrf-token".
 * @returns {string|null} - The CSRF token, or null if it wasn't found.
 */
const getCsrfToken = () => {
  const metaTag = document.querySelector('meta[name="x-owp-csrf-token"]');
  return metaTag ? metaTag.getAttribute("content") : null;
};
/**
 * Format a Unix timestamp in a specific time zone, default is "America/New_York".
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @param {string} [timeZone='America/New_York'] - The time zone to format the date in.
 * @returns {string} - A formatted string representing the date, in the format "Thu, Jun 4, 2:15 PM EDT".
 */
const formatUnixTimestamp = (unixTimestamp, timeZone = 'America/New_York') => {
  // Convert seconds to milliseconds
  const date = new Date(unixTimestamp * 1000);

  // Define options for formatting the date with a specific time zone
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    hour12: false,
    timeZone: timeZone // Specify the time zone, default is "America/New_York"
  };

  // Create a formatter for the desired format and time zone
  const formatter = new Intl.DateTimeFormat('en-US', options);

  // Format the date
  return formatter.format(date);
}
/**
 * Calculates how long ago a given Unix timestamp is, in a human-readable format.
 * @param {number} unixTimestamp - The Unix timestamp in seconds.
 * @returns {string} - A string representing how long ago the timestamp is, in the format "X day(s) ago", "X hour(s) ago", "X minute(s) ago", or "X second(s) ago".
 */
const getLiveUnixTimeDifference = (unixTimestamp, timeZone = 'America/New_York') => {
  // Get current time in the specified timezone
  const now = new Date().toLocaleString('en-US', { timeZone });
  const currentTime = new Date(now).getTime(); // Convert to timestamp in ms

  const timestampMs = unixTimestamp; // No need to multiply by 1000 since it's already in ms
  const diffMs = currentTime - timestampMs;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day(s) ago`;
  if (hours > 0) return `${hours} hour(s) ago`;
  if (minutes > 0) return `${minutes} minute(s) ago`;
  return `${seconds} second(s) ago`;
};


/**
 * Takes an ISO date string and formats it to a short date string in a specified time zone.
 * The formatted string excludes the year and uses a 24-hour format (e.g., "Oct 4, 21:45").
 *
 * @param {string} isoDateString - ISO-formatted date string.
 * @param {string} [timeZone='America/New_York'] - The time zone to format the date in.
 * @returns {string} - The formatted date string.
 */
const formatISODate = (isoDateString, timeZone = 'America/New_York') => {
  // Create a new Date object from the ISO string
  const date = new Date(isoDateString);

  // Options for formatting
  const options = {
    day: "numeric",
    month: "short",
    hour: "numeric", // Numeric for 24-hour format
    minute: "2-digit",
    hour12: false, // false for 24-hour format
    timeZone: timeZone, // Change to your desired timezone
    timeZoneName: "short",
  };

  // Create a formatter
  const formatter = new Intl.DateTimeFormat("en-US", options);

  // Format the date
  const formattedDate = formatter.format(date);

  // Remove the year part from the formatted date
  return formattedDate.replace(/, \d{4}/, "");
};
/**
 * Calculates the difference between the current time and a given ISO-formatted date string.
 * Returns an object with the following properties:
 *   - days: the number of days in the difference
 *   - minutes: the remaining minutes in the difference (0-59)
 *   - seconds: the remaining seconds in the difference (0-59)
 * @param {string} isoDateString - The ISO-formatted date string to calculate the difference from
 * @returns {{days: number, minutes: number, seconds: number}} Object with the difference
 */
const getLiveISOTimeDifference = (isoDateString) => {
  // Get the current time
  const now = new Date();

  // Convert the ISO date string to a Date object
  const createdDate = new Date(isoDateString);

  // Calculate the difference in milliseconds
  const differenceInMilliseconds = now - createdDate;

  // Calculate days, hours, minutes, and seconds
  const seconds = Math.floor(differenceInMilliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // Remaining minutes and seconds
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  // Return the formatted time difference
  return { days, minutes: remainingMinutes, seconds: remainingSeconds };
};
/**
 * Function to show a notification on the webpage.
 * The notification includes a message body and a type (info, success, warning, danger, note).
 * The notification is styled based on the type with specific colors and icons.
 * @param {string} body - The message content of the notification.
 * @param {string} [type='info'] - The type of notification (info, success, warning, danger, note, arrival, departure and LoadReady).
 */
const showNotification = (body, type = "info") => {
  console.log(body);
  const notificationId = `notification-${Date.now()}`;

  if (!document.querySelector('link[href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css";
    document.head.appendChild(link);
  }
  // Define colors based on type (info, success, warning, danger, arrival, LoadReady)
  const typeStyles = {
    arrival: { background: "#dbf6d3", border: "#aed4a5", color: "#569745" },
    info: { background: "#d9edf7", border: "#98cce6", color: "#3a87ad" },
    warning: { background: "#fcf8e3", border: "#f1daab", color: "#c09853" },
    danger: { background: "#f2dede", border: "#e0b1b8", color: "#b94a48" },
    note: { background: "#f5f5f5", border: "#dcdcdc", color: "#666666" },
    departure: { background: "#b2f2e2", border: "#182b4f", color: "#0d6b45" },
    LoadReady: { background: "#d1c4e9", border: "#9575cd", color: "#5e35b1" },
  };

  // Create the notification div
  const notificationDiv = document.createElement("div");
  notificationDiv.id = notificationId;
  notificationDiv.className = `alert alert-${type} alert-white rounded`;

  // Apply modern styles
  notificationDiv.style.position = "fixed";
  notificationDiv.style.bottom = "0";
  notificationDiv.style.left = "50%";
  notificationDiv.style.transform = "translateX(-50%) translateY(100%)"; // Start off-screen
  notificationDiv.style.width = "75%";
  notificationDiv.style.padding = "20px";
  notificationDiv.style.backgroundColor = typeStyles[type].background;
  notificationDiv.style.border = `1px solid ${typeStyles[type].border}`;
  notificationDiv.style.borderRadius = "10px";
  notificationDiv.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.1)";
  notificationDiv.style.color = typeStyles[type].color;
  notificationDiv.style.zIndex = "1000";
  notificationDiv.style.transition = "transform 0.5s ease"; // Smooth animation

  // Add notification content
  notificationDiv.innerHTML = `
    <button type="button" class="close" style="
        float: right;
        font-size: 21px;
        font-weight: bold;
        line-height: 1;
        color: #000;
        text-shadow: 0 1px 0 #fff;
        opacity: .2;
        background: transparent;
        border: none;
        cursor: pointer;
        ">×</button>
        <div class="icon" style="
        display: inline-flex; /* Change to inline-flex for better centering */
        align-items: center; /* Center the icon vertically */
        justify-content: center; /* Center the icon horizontally */
        width: 25px;
        height: 25px;
        text-align: center;
        background-color: ${typeStyles[type].color};
        border-radius: 50%;
        color: white;
        margin-right: 15px;
    ">
    <i class="fa ${type === "success"
      ? "fa-solid fa-circle-check"
      : type === "info"
        ? "fa-solid fa-circle-info"
        : type === "warning"
          ? "fa-solid fa-triangle-exclamation"
          : type === "danger"
            ? "fa-solid fa-circle-xmark"
            : type === "arrival"
              ? "fa-solid fa-truck"  // Example icon for arrival
              : type === "LoadReady"
                ? "fa-solid fa-truck-ramp-box"  // Example icon for loading complete
                : type === "departure"
                  ? "fa-solid fa-truck-fast" // Example icon for departure
                  : "fa-solid fa-pen-to-square"
    }"></i>
    </div>
    <strong>${type.charAt(0).toUpperCase() + type.slice(1)
    }!</strong> ${body.replace(/\n/g, "<br>")}
    `;

  // Append notification to the body
  document.body.appendChild(notificationDiv);

  // Trigger slide-in animation
  setTimeout(() => {
    notificationDiv.style.transform = "translateX(-50%) translateY(0)"; // Slide in
  }, 50);

  // Add event listener to the close button
  notificationDiv.querySelector(".close").addEventListener("click", () => {
    notificationDiv.style.transform = "translateX(-50%) translateY(100%)"; // Slide out
    setTimeout(() => document.body.removeChild(notificationDiv), 500); // Remove after animation
  });

  // Optionally play a sound
  playSound(type);
};
/**
 * Function to play a sound based on the type provided.
 * The function selects a sound URL based on the type of notification.
 * It plays the audio and logs the result of the playback.
 *
 * @param {string} type - The type of notification (success, info, warning, danger, note).
 */
const playSound = (type) => {
  let soundUrl;

  switch (type) {
    case "arrival":
      soundUrl = "https://files.catbox.moe/7yc3lb.mp3";
      break;
    case "departure":
      soundUrl = "https://www.zapsplat.com/wp-content/uploads/2015/sound-effects-93160/zapsplat_multimedia_ui_chime_tone_simple_007_99767.mp3";
      break;
    case "LoadReady":
      soundUrl = "https://www.zapsplat.com/wp-content/uploads/2015/sound-effects-93160/zapsplat_multimedia_ui_chime_tone_simple_006_99766.mp3";
      break;
    case "info":
      soundUrl = "https://files.catbox.moe/lttgjh.wav";
      break;
    case "warning":
      soundUrl = "https://files.catbox.moe/06nvrz.wav";
      break;
    case "danger":
      soundUrl = "https://files.catbox.moe/mpfn73.mp3";
      break;
    case "note":
      soundUrl = "https://files.catbox.moe/w8rzy5.wav";
      break;
    default:
      soundUrl = "https://www.sndup.net/g5jhy/d";
  }
  const audio = new Audio(soundUrl);
  audio
    .play()
    .then(() => {
      console.log("Audio playing successfully");
    })
    .catch((error) => {
      console.error("Audio playback failed:", error);
    });
};

/**
 * Clears all notifications on the page by animating them out and then removing them.
 */
const clearNotifications = () => {
  const notifications = document.querySelectorAll('.alert'); // Select all notification elements
  notifications.forEach(notification => {
    // Slide the notification out
    notification.style.transition = 'transform 0.5s ease, opacity 0.5s ease'; // Smooth transition
    notification.style.transform = 'translateX(-50%) translateY(100%)'; // Slide down
    notification.style.opacity = '0'; // Fade out

    // Remove the notification after the animation
    setTimeout(() => notification.remove(), 500); // Wait for the animation to complete
  });
};


/**
 * Adds a "Clear Notifications" button and a "Check ETA" toggle checkbox to the top of the Amazon Relay dashboard.
 * The "Clear Notifications" button clears all notifications on the page when clicked.
 * The "Check ETA" toggle checkbox enables/disables the live ETA calculation feature.
 * The style of the buttons and checkbox is matched to the existing styles on the page.
 */
const addClearNotificationsAndETACheckbox = () => {
  const tabList = document.querySelector('.css-1tjbqgb'); // Select the tab list container
  if (!tabList) {
    console.error('Tab list container not found');
    return;
  }

  // Create the Clear Notifications button wrapper
  const clearButtonWrapper = document.createElement('label');
  clearButtonWrapper.className = 'css-1uei0cx'; // Use provided base styles
  clearButtonWrapper.setAttribute('role', 'button'); // Accessibility role

  // Add span and button text
  const clearButtonSpan = document.createElement('span');
  clearButtonWrapper.appendChild(clearButtonSpan);

  const clearButtonText = document.createElement('div');
  clearButtonText.className = 'css-14dbfau'; // Match existing styles
  clearButtonText.textContent = 'Clear Notifications';
  clearButtonSpan.appendChild(clearButtonText);

  // Add indicator div for Clear Notifications button
  const clearIndicatorDiv = document.createElement('div');
  clearIndicatorDiv.className = 'css-1iw0jih'; // Initial unchecked state
  clearButtonWrapper.appendChild(clearIndicatorDiv);

  // Attach click event to clear notifications and change style
  clearButtonWrapper.addEventListener('click', () => {
    clearNotifications();
    // Set the class to `css-zccwph` on click
    clearIndicatorDiv.classList.remove('css-1iw0jih');
    clearIndicatorDiv.classList.add('css-zccwph');
    setTimeout(() => {
      // Revert to initial style after 500ms
      clearIndicatorDiv.classList.remove('css-zccwph');
      clearIndicatorDiv.classList.add('css-1iw0jih');
    }, 500);
  });

  // Create the Check ETA toggle checkbox wrapper
  const checkboxWrapper = document.createElement('label');
  checkboxWrapper.className = 'css-1uei0cx'; // Use provided base styles
  checkboxWrapper.setAttribute('role', 'tab'); // Accessibility role

  // Add span and label text
  const checkboxSpan = document.createElement('span');
  checkboxWrapper.appendChild(checkboxSpan);

  const checkboxLabelText = document.createElement('div');
  checkboxLabelText.className = 'css-14dbfau';
  checkboxLabelText.textContent = 'Enable Live ETA';
  checkboxSpan.appendChild(checkboxLabelText);

  // Add indicator div for checkbox
  const indicatorDiv = document.createElement('div');
  indicatorDiv.className = 'css-1iw0jih'; // Initial unchecked state
  checkboxWrapper.appendChild(indicatorDiv);

  // Add event listener to toggle checkbox state and style
  checkboxWrapper.addEventListener('click', () => {
    calculateLiveETAEnabled = !calculateLiveETAEnabled; // Toggle the state

    // Update the class name based on the state
    if (calculateLiveETAEnabled) {
      indicatorDiv.classList.remove('css-1iw0jih');
      indicatorDiv.classList.add('css-zccwph');
    } else {
      indicatorDiv.classList.remove('css-zccwph');
      indicatorDiv.classList.add('css-1iw0jih');
    }

    console.log(`Live ETA calculation ${calculateLiveETAEnabled ? 'enabled' : 'disabled'}`);
  });

  // Insert the Clear Notifications button and Check ETA checkbox into the tab list
  const firstTab = tabList.querySelector('label');
  if (firstTab) {
    tabList.insertBefore(clearButtonWrapper, firstTab); // Add Clear Notifications button first
    tabList.insertBefore(checkboxWrapper, firstTab); // Add Check ETA checkbox second
  }
};

/**
 * Formats a given first name by correcting improperly concatenated names
 * and standardizing capitalization.
 *
 * If the name is improperly concatenated (e.g., "johnDoe"), it inserts
 * a space between the concatenated parts and takes the first part.
 * Ensures the first letter is capitalized and the rest of the letters
 * are in lowercase.
 *
 * @param {string} firstName - The first name to be formatted.
 * @returns {string} - The formatted first name, or an empty string if
 * the input is falsy.
 */
const formatFirstName = (firstName) => {
  if (!firstName) return '';

  // Regex to handle improperly concatenated names
  if (/^[a-zA-Z]+[A-Z]/.test(firstName)) {
    // Insert a space between concatenated names, then split and take the first part
    firstName = firstName.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ')[0];
  }

  // Capitalize the first letter and convert the rest to lowercase
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};


//Checks:
/**
 * Fetches tour entities from the Amazon Relay API.
 * Sends a POST request to the "tours/entities" endpoint with specific search criteria,
 * including filters for stages, load types, and sort order.
 * The request includes a CSRF token for authentication and uses cookies for session management.
 * Parses the JSON response and returns the tour data.
 *
 * @returns {Promise<object>} - A promise that resolves to the JSON response containing tour entities.
 * @throws {Error} - Throws an error if the HTTP request fails.
 */
const fetchTours = async () => {
  const csrfToken = getCsrfToken();
  const response = await fetch("https://relay.amazon.com/api/tours/entities", {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Cookie: Cookie,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      blockSearchCriteria: null,
      domicileFilters: [],
      pageSize: 100,
      sortOrderList: [
        { direction: "desc", field: "IS_RETENDERED" },
        { direction: "desc", field: "IS_UNACCEPTED" },
        { direction: "asc", field: "START_DATE" },
        { direction: "asc", field: "START_DATE" },
      ],
      tourSearchCriteria: {
        driverEmails: [],
        driverIds: [],
        driverStatus: null,
        ids: [],
        isRetendered: null,
        isRetenderedDiffRequired: true,
        isTabsDataDateRangeApplicable: true,
        loadTypeFilters: ["All"],
        isRecommendationsFilterEnabled: false,
        location: null,
        pageNumber: 1,
        pageStartItemToken: 0,
        searchFilters: [],
        stages: ["in-transit"],
        startTime: "2024-09-22T04:00:00.000Z",
        textSearchQuery: null,
        trackingStatuses: [],
        isOneWayTrip: null,
        isRoundTrip: null,
        isDelayed: null,
        isDriverAssigned: null,
        isAttentionNeeded: null,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Use await here to get the resolved JSON data
  return await response.json();
};
/**
 * Sends a request to fetch notes for a given entity and load.
 * It retrieves the notes from the API endpoint and processes them using the processNotes function.
 * @param {object} entity - The current tour entity
 * @param {object} load - The current load in the loop
 * @param {string} entityId - The entity Tour ID
 * @param {string} entityVersion - The version of the entity
 */
const fetchNotes = async (entity, load, entityId, entityVersion) => {
  //console.log("Sending note request...");

  try {
    const csrfToken = getCsrfToken();

    const response = await fetch(`https://relay.amazon.com/api/tours/tours/${entityId}/${entityVersion}/notes`, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        Connection: "keep-alive",
        Cookie: Cookie,
        Host: "relay.amazon.com",
        Referer: "https://relay.amazon.com/tours/in-transit?ref=owp_nav_tours&itsrtb=START_DATE&itsrtdrctn=desc",
        "User-Agent": navigator.userAgent,
        "x-csrf-token": csrfToken
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // Step 1: Retrieve current notes from the response
    const currentNotes = await response.json();

    //Process the notes
    processNotes(entity, load, entityId, currentNotes);

  } catch (error) {
    console.error('Error fetching notes:', error);
  }
}
/**
 * Process the current notes for the given entity and load.
 * @param {string} entity - The current tour entity from the response
 * @param {string} load - The current load in the loop
 * @param {string} entityId - The entity Tour ID.
 * @param {object} currentNotes - The current notes for the entity
 *
 * Iterates over the notes and checks if any of the notes are new compared to the stored notes.
 * If a new note is found, it will show a notification with the note text and the time it was added.
 * After processing all notes, it will update the stored notes with the new notes.
 */
const processNotes = (entity, load, entityId, currentNotes) => {
  // Step 2: Retrieve all stored notes from local storage

  // Step 3: Compare current notes with original notes for this specific entity
  const originalNotes = allStoredNotes[entityId] || [];
  // Create an array to store new notes for this entity
  const newNotes = [];
  const driverName = load?.driverList?.length > 0
    ? `${load.driverList[0].firstName} ${load.driverList[0].lastName}`
    : "Unknown Driver";
  for (const blockNote of currentNotes) {
    // If there are notes in the current block
    if (blockNote.notesList && blockNote.notesList.length > 0) {
      // Iterate over each note in the block
      for (const note of blockNote.notesList) {
        const exists = originalNotes.some(originalNote =>
          // Check if the note exists in the original notes by comparing:
          // - load ID
          // - comment
          // - createdDate
          originalNote.loadId === blockNote.loadId &&
          originalNote.notesList.some(orig => orig.comment === note.comment && orig.createdDate === note.createdDate)
        );
        // If the note doesn't exist in the original notes, it's a new note
        if (!exists) {
          // Add the new note to the array, including the createdDate for comparison
          newNotes.push({
            loadId: blockNote.loadId,
            note: note.comment,
            createdDate: note.createdDate,
            scac: note.userDetails.scac
          });
        }
      }
    }
  }
  // Step 4: Show notifications for new notes
  for (const newNote of newNotes) {
    // Calculate how long ago the note was added
    const { days, minutes, seconds } = getLiveISOTimeDifference(newNote.createdDate);
    const timeAgoText =
      days > 0 ? `${days} day${days > 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''} ago` :
        minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''} ago` :
          seconds < 30 ? "less than 30 seconds ago" : `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    // Show a notification for each new note, including the time difference
    showNotification(
      `Block: ${entity.resourceBlock?.id || entity.id} VRID: ${newNote.loadId} Driver: <strong>${driverName}</strong>, A New Note was added by <strong>${newNote.scac}</strong> ${timeAgoText}:\n"${newNote.note}"`,
      `note`
    );
  }

  // Step 5: Update the stored notes for this specific entity
  allStoredNotes[entityId] = currentNotes;
  // Step 6: Save the updated notes for all entities in local storage
  //localStorage.setItem('ALLNOTES', JSON.stringify(allStoredNotes));
}
/**
 * Compares the number of loads in the current entity with the number of loads in the original entity.
 * If the numbers are different, it finds the loads that were added or removed from the entity
 * and shows a notification with the following format:
 * "Loads were altered on <driver name>'s trip; Block ID: <block ID>. The following loads' VRIDs were either added or removed: <list of changed VRIDs>"
 * @param {object} driver - The driver object, containing the driver's name
 * @param {object} originalEntity - The original entity object, containing the original loads array
 * @param {object[]} loads - The current loads array
 */
const compareAndNotifyLoadChanges = (driver, originalEntity, loads) => {
  /*
  *Check if the number of loads in the current entity is different from the number of loads in the original entity
  *If it is, find the larger and smaller of the two arrays
  *The larger array will have the complete list of loads, and the smaller array will be missing some loads
  */
  if (loads.length !== originalEntity.loads.length) {
    // If the original entity has more loads than the current entity, use the original entity's loads array
    // Otherwise, use the current entity's loads array
    const largerLoad = originalEntity.loads.length > loads.length ? originalEntity.loads : loads;
    // If the original entity has fewer loads than the current entity, use the original entity's loads array
    // Otherwise, use the current entity's loads array
    const smallerLoad = originalEntity.loads.length < loads.length ? originalEntity.loads : loads;
    // Find the loads that are present in the larger array but not in the smaller array
    // This will give us the loads that were added or removed from the entity
    const changedLoads = largerLoad.filter(item => {
      // For each item in the larger array, check if there is no item in the smaller array
      // with the same versionedLoadId.id. If there isn't, that means the load was added or removed
      return !smallerLoad.find(smallerItem => item.versionedLoadId.id === smallerItem.versionedLoadId.id);
    });
    // Get the driver's full name
    const driverFullName = `${driver?.firstName} ${driver?.lastName}`;
    // If there are any changed loads, show a notification with the following format:
    // "Loads were altered on <driver name>'s trip; Block ID: <block ID>. The following loads' VRIDs were either added or removed: <list of changed VRIDs>"
    if (changedLoads.length > 0) {
      showNotification(
        `Loads were altered on ${driverFullName}'s trip; ` +
        `Block ID: ${originalEntity.resourceBlock?.id || originalEntity.id}. ` +
        `The following loads' VRIDs were either added or removed: ` +
        `${changedLoads.map(item => item.versionedLoadId.id).join(", ")}`,
        'warning'
      );
    }
  }
};
/**
 * Iterates through the stops in the given load and checks for delays.
 * Will notify of delays for driver's check-in and check-out on the first stop.
 * Will notify of delays for check-in only on the second stop.
 * @param {object} entity - The Tour associated with the load
 * @param {object} load - The VRID information related to the load
 */
const checkStopDelays = (entity, load) => {

  if (!entity.isRetendered && !entity.isUnaccepted) {
    // For each load, process the stops (focus on stop[0] and stop[1])
    if (load.stops && load.stops.length > 1) {
      const stop0 = load.stops[0];
      const stop1 = load.stops[1];

      // Notify for CHECKIN and CHECKOUT on stop[0]
      for (const action of stop0.actions) {
        if (["CHECKIN", "CHECKOUT"].includes(action.type)) {
          notifyForDelays(entity, load, action, 0); // Stop[0] - check both CHECKIN and CHECKOUT
        }
      }

      // Notify for CHECKIN only on stop[1]
      for (const action of stop1.actions) {
        if (action.type === "CHECKIN") {
          notifyForDelays(entity, load, action, 1); // Stop[1] - check CHECKIN only
        }
      }
    }
  }
};
/**
 * Checks if an action has been delayed and no delay has been reported, a notification is shown to report the delay.
 * If the actual time is after the planned time, a notification is shown.
 * If the current time is past the planned time, no actual time has been reported.
 * @param {object} entity - The Tour associated with the action
 * @param {object} load - The VRID information related to the action
 * @param {object} action - The current action (check-in/check-out) being processed
 * @param {number} stopIndex - The index of the stop being checked in the VRID
 */
const notifyForDelays = (entity, load, action, stopIndex) => {
  if (!entity.isRetendered && !entity.isUnaccepted) {
    const currentTime = new Date();
    const plannedTime = new Date(action.plannedTime);
    const actualTime = action.actualTime ? new Date(action.actualTime) : null;
    const delayReport = action.delayReport;

    const stop = load.stops[stopIndex]; // Get the stop we're processing
    const timeZone = stop.location.timeZone;

    // Helper function to calculate the difference in minutes
    const getMinuteDifference = (date1, date2) => {
      return Math.abs((date1 - date2) / (1000 * 60));
    };

    if (!load.cancelTime && !delayReport) {
      if (actualTime && actualTime > plannedTime) {
        // Check if the difference is at least 1 minute
        if (getMinuteDifference(actualTime, plannedTime) >= 1) {
          showNotification(
            `In Block: ${entity.resourceBlock?.id || entity.id}, Driver: ${entity?.drivers[0]?.firstName} ${entity?.drivers[0]?.lastName}; Load ID: ${load.versionedLoadId.id}.\n
                Delayed ${action.type}: Planned Time: ${formatISODate(action.plannedTime, timeZone)}, Actual Time: ${formatISODate(action.actualTime, timeZone)}`,
            'warning'
          );
        }
      }

      if (!actualTime && currentTime > plannedTime) {
        showNotification(
          `In Block: ${entity.resourceBlock?.id || entity.id}, Driver: ${entity?.drivers[0]?.firstName} ${entity?.drivers[0]?.lastName}; Load ID: ${load.versionedLoadId.id}.\n
              Report delay for ${action.type}: Planned Time was ${formatISODate(action.plannedTime, timeZone)}, but no check-in/out has occurred (Time now is ${formatISODate(currentTime, timeZone)}).`,
          'danger'
        );
      }
    }
  }
};
/**
 * Checks for gaps in the sequence of facilities for a given driver's trip and notifies if any gaps are found.
 * The function iterates through the sequence of stops for each trip, checking for missing connections between facilities.
 * If the sequence of facilities does not form a continuous path or loop, a notification is shown.
 *
 * @param {object} driver - The driver object, containing the driver's name.
 * @param {object} entity - The Tour object, containing the block information.
 * @param {object[]} loads - The array of trips, each containing stop and VRID information.
 */
const checkFacilitySequenceGaps = (driver, entity, loads) => {

  if (!entity.isRetendered && !entity.isUnaccepted) {
    // Array to store the sequence of facilities
    const facilityPath = [];
    // Extract the start and end facilities for each load's facilitySequence
    for (const load of loads) {
      // Ensure the load is not cancelled by checking if cancelTime is null
      if (!load.cancelTime) {
        for (const [i, stop] of load.stops.entries()) {
          const startFacility = stop.locationCode; // Current stop location
          const endFacility = load.stops[i + 1]?.locationCode; // Next stop location

          // Push only if there is an end facility
          if (endFacility) {
            facilityPath.push({
              start: startFacility,
              end: endFacility,
              VRID: load.versionedLoadId.id,
            });
          }
        }
      }
    }

    // Check if there is a missing gap between consecutive facilities
    // Check if there is a missing gap between consecutive facilities
    let previousEnd = null;
    let previousVRID = null; // Store the VRID of the previous facility

    for (const facility of facilityPath) {
      if (previousEnd) {
        // Directly compare the end of the previous facility with the start of the current facility
        const previousEndPrefix = previousEnd;
        const currentStartPrefix = facility.start;

        // If the prefixes do not match, there's a gap
        if (previousEndPrefix !== currentStartPrefix) {
          showNotification(
            `Gap detected in Block: ${entity.resourceBlock?.id || entity.id}, Driver: <strong>${driver?.firstName} ${driver?.lastName}</strong> ; Load ID: ${facility.VRID}. Missing connection between site: <strong>${previousEnd} and ${facility.start}</strong>`,
            "warning"
          );
          console.log(
            `Gap detected between ${previousEnd} and ${facility.start}, Load ID: ${previousVRID}`
          );
        }
      }
      // Update the previousEnd to the current facility's end
      previousEnd = facility.end;
      previousVRID = facility.VRID;
    }

    // Ensure the final facility loops back to the starting one
    const finalEnd = facilityPath[facilityPath.length - 1]?.end;
    const firstStart = facilityPath[0]?.start;

    // Compare the prefixes of the final end and the first start
    if (finalEnd && firstStart) {
      const finalEndPrefix = finalEnd;
      const firstStartPrefix = firstStart;

      if (finalEndPrefix !== firstStartPrefix) {
        showNotification(
          `Final facility ${finalEnd} does not loop back to the starting facility ${firstStart} in Block: ${entity.resourceBlock?.id || entity.id}`,
          "danger"
        );
        console.log(
          `Sequence in Block: ${entity.resourceBlock?.id || entity.id} does not form a loop: Final facility is ${finalEnd}, but should connect to ${firstStart}`
        );
      } else {
        // console.log(
        //   `The facilities in Block: ${entity.resourceBlock?.id || entity.id} sequence forms a complete loop.`
        // );
      }
    }
  }
};
/**
 * Checks and notifies of any changes in the specified fields between the current load and the original load.
 * Sends a notification if a change is detected in fields such as loadType, facilitySequence, isEBOLRequired, etc.
 * Special notifications are sent for changes in `areNotesPresent`, `cancelTime`, and `loadType`.
 * Additional alert for trailer assignment if `loadType` is not "BOBTAIL" and `physicalTrailerId` exists.
 *
 * @param {object} load - The current load object containing the latest load details.
 * @param {object} originalLoad - The original load object for comparison.
 * @param {object} originalEntity - The original entity object containing the resource block ID.
 * @param {object} driver - The driver object containing the driver's first and last name.
 */
const checkAndNotifyLoadChanges = (load, originalLoad, originalEntity, driver) => {
  const loadChecks = [`loadType`, `facilitySequence`, `isEBOLRequired`, `areNotesPresent`, `physicalTrailerId`, `cancelTime`,];
  // Iterate over the fields that we want to check for changes
  for (const field of loadChecks) {
    // If the value of the field has changed, show a notification
    if (load[field] !== originalLoad[field]) {
      switch (field) {
        case "areNotesPresent":
          showNotification(
            `A new note was added on a VRID with no notes: Block ID ${originalEntity.resourceBlock?.id || originalEntity.id} (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id}`,
            "info"
          );
          break;

        case "cancelTime":
          showNotification(
            `A VRID HAS BEEN CANCELLED! Block ID ${originalEntity.resourceBlock?.id || originalEntity.id
            } (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id
            } at ${formatUnixTimestamp(
              load.cancelTime,
              load.stops[0].location.timeZone
            )}`,
            "danger"
          );
          break;

        case "loadType":
          showNotification(
            `Load Type Changed: Block ID ${originalEntity.resourceBlock?.id || originalEntity.id} (Trip: ${originalLoad.facilitySequence}), Driver: <strong>${driver?.firstName} ${driver?.lastName}</strong>, VRID ${load.versionedLoadId.id}.\n <strong>from ${originalLoad.loadType} to ${load.loadType}</strong>`,
            "danger"
          );

          // Additional logic for 'loadType' when it's not "BOBTAIL"
          if (load[field] !== "BOBTAIL" && load.physicalTrailerId) {
            showNotification(
              `Trailer Assigned to VRID: Block ID ${originalEntity.resourceBlock?.id || originalEntity.id} (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id}: ${load.physicalTrailerId}`,
              "warning"
            );
          }
          break;

        case "isEBOLRequired":
          showNotification(
            `NEW LOADED TRAILER WITH A BOL REQUIREMENT: Block ID ${originalEntity.resourceBlock?.id || originalEntity.id} (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id}`,
            "warning"
          );
          break;

        default:
          // Default behavior for unspecified fields
          showNotification(
            `Block ID ${originalEntity.resourceBlock?.id || originalEntity.id}, VRID ${load.versionedLoadId.id}, Driver: <strong>${driver?.firstName} ${driver?.lastName}</strong> \n
            ${field} Changed From ${originalLoad[field]} to ${load[field]}`,
            "info"
          );
          break;
      }
    }
  }
}
/**
 * Fetches asset data from the Amazon Relay API and populates the asset map with active and unavailable assets.
 * Filters assets based on their lifecycle states and rental status.
 * Throws an error if the HTTP request fails.
 *
 * @throws {Error} - Throws an error if the HTTP request for the assets fails.
 */
const fetchAssets = async () => {
  const response = await fetch("https://relay.amazon.com/api/assets/search", {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Cookie: Cookie
    },
    body: JSON.stringify({
      lifecycleStates: [
        { state: "ACTIVE" },
        { state: "UNAVAILABLE" }
      ],
      assetTypes: ["tractor", "boxTruck"],
      fieldFilters: [
        {
          key: "rentalStatus",
          values: [
            "PERMALOANER_RENTED",
            "LOANER_RENTED",
            "RENTED",
            "RESERVED",
            "RESERVED_SWAP",
            "PERMALOANER_RESERVED",
            "PERMALOANER_RESERVED_SWAP"
          ]
        }
      ],
      numberOfRecordsToReturn: 1000
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error during fetching Assets! status: ${response.status}`);
  }

  const data = await response.json(); // Get the JSON data from the response
  // Create the asset map
  for (const assetcontainer of data.assets) {
    const licensePlateId = assetcontainer.asset.attributesText.licensePlateId;
    if (licensePlateId) {
      assetMap.set(licensePlateId, assetcontainer);
    }
  }
};
/**
 * Fetches a new access token from the Amazon Relay API.
 * Updates the global `relayToken` with the fetched token and sets its expiration time.
 * Returns the fetched token if successful; otherwise, logs an error and returns null.
 *
 * @returns {Promise<string|null>} - A promise that resolves to the access token or null if an error occurs.
 * @throws {Error} - Throws an error if the HTTP request for the token fails.
 */
const getAPIBearerToken = async () => {
  try {
    const response = await fetch("https://relay.amazon.com/api/token");
    if (!response.ok) throw new Error("Token fetch failed");

    const data = await response.json();
    relayToken = data.access_token; // Update relayToken with the fetched token
    tokenExpiration = Date.now() + (data.expires_in * 1000); // Set the expiration time (in milliseconds)

    return relayToken;
  } catch (error) {
    console.error("Error fetching token:", error);
    return null;
  }
};
/**
 * Fetches position data for a given Amazon Asset ID (AAID) from the Amazon Relay API.
 * Checks if the API token is expired or not set, and fetches a new one if necessary.
 * Returns the Geolocation data as a JSON object if successful; otherwise, logs an error and returns null.
 *
 * @param {string} aaid - The AID of the tractor to query.
 * @returns {Promise<object|null>} - A promise that resolves to the position data or null if an error occurs.
 * @throws {Error} - Throws an error if the HTTP request for the token or position data fails.
 */
const fetchPositionData = async (aaid) => {
  try {
    // Check if the token is expired or not set
    if (!relayToken || (Date.now() >= tokenExpiration)) {
      const token = await getAPIBearerToken(); // Fetch a new token if expired or missing
      if (!token) {
        console.error("Token is missing, cannot proceed with request.");
        return null;
      }
    }

    const response = await fetch(
      `https://us-east-1.na.api.relay.amazon.dev/track-trace/api/v2/transport-views/NA:EQ:${aaid.toUpperCase()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Cookie: Cookie,
          "x-relay-access-token": relayToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch position data: ${response.statusText}`);
    }

    const data = await response.json();
    return data.position; // Adjust according to the actual structure of the response
  }
  catch (error) {
    console.error("Error fetching position data:", error);
    return null; // Return null in case of an error
  }
};
/**
 * Fetch position data using the VRID and Tour ID as fallback if AAID data is outdated.
 * @param {string} aaid - The Amazon Asset ID for primary location fetch.
 * @param {string} vrid - The VRID for fallback API call.
 * @param {string} tourId - The Tour ID for fallback API call.
 * @returns {Promise<object|null>} - Most recent position data or null if unavailable.
 */
const fetchLatestPositionData = async (aaid, vrid, tourId) => {
  const aaidData = await fetchPositionData(aaid); // Fetch AAID position data

  // Fallback to VRID-based API if AAID data is older than 6 minutes
  let fallbackData = null;
  if (aaidData && aaidData.timestamp) {
    const aaidTimestamp = new Date(aaidData.timestamp);
    const now = new Date();
    const timeDiffMinutes = (now - aaidTimestamp) / (1000 * 60);

    // If AAID data is older than 6 minutes, fetch fallback data
    if (timeDiffMinutes > 6) {
      fallbackData = await fetchPositionDataFromTour(vrid, tourId);
    }
  } else {
    // If AAID data is missing, fetch fallback data immediately
    fallbackData = await fetchPositionDataFromTour(vrid, tourId);
  }

  // Compare timestamps and choose the freshest data
  if (fallbackData && fallbackData.timestamp) {
    const fallbackTimestamp = new Date(fallbackData.timestamp);
    if (!aaidData || new Date(aaidData.timestamp) < fallbackTimestamp) {
      return fallbackData;
    }
  }

  return aaidData || fallbackData;
};

/**
 * Fetch position data using the VRID and Tour ID.
 * @param {string} vrid - The VRID for the API call.
 * @param {string} tourId - The Tour ID for the API call.
 * @returns {Promise<object|null>} - Position data or null if unavailable.
 */
const fetchPositionDataFromTour = async (vrid, tourId) => {
  try {
    const url = `https://us-east-1.na.api.relay.amazon.dev/track-trace/api/v2/transport-views/NA:TOUR:${tourId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        "x-relay-access-token": relayToken, // Ensure relayToken is set
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.position;
    } else {
      console.error(`Failed to fetch position data from VRID: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching position data from VRID:", error);
    return null;
  }
};

/**
 * Calculates the estimated time of arrival for a given stop and action, using the last updated geolocation of the tractor.
 * @param {object} load - The load object containing the tractor detail and stops.
 * @param {object} stop - The stop object containing the actions.
 * @param {object} action - The action object containing the delay report status.
 * @param {object} driver - The driver object containing the first and last name.
 * @param {boolean} hasLaterTimestamps - Indicates whether there are any later timestamps in the load.
 * @returns {Promise<void>} - A promise that resolves when the calculation is complete.
 * @throws {Error} - Throws an error if the HTTP request for the position data or matrix ETA fails.
 */
const calculateLiveETA = async (entity, load, stop, action, driver, hasLaterTimestamps) => {

  // Ensure delay is not reported
  // Ensure not missing timestamp (hasLaterTimestamps)
  // Ensure that he hasn't arrived yet.
  // Ensure it's not a cancelled load
  // Get live location and stop location
  // Ensure driver is checked out from the site
  // Calculate time difference to next check in stop
  // if ETA > Scheduled arrival time
  // Alert he'll be late due.
  // Otherwise no.
  // Done: Problem, the last updated geolocation is not updated, and so the ETA is not calculated correctly.
  // ATTEMPT TO GET LAST UPDATED GEOLOCATION FROM ASSETS API.
  if (calculateLiveETAEnabled) {
    const licensePlateId = load.tractorDetail?.assetId;
    const asset = assetMap.get(licensePlateId);
    const vrid = load.versionedLoadId.id;
    const tourId = entity.id;
    //const delayReport = action.delayReport;
    const timeZone = stop.location.timeZone;
    if (stop === load.stops[load.stops.length - 1] && action === stop.actions[1] && !action.actualTime) {
      return;
    }
    if (!load.cancelTime && !hasLaterTimestamps && action.type === "CHECKOUT" && action.actualTime) { //TODO: !delayReport (Recheck code logic for delay report)
      const nextLoadIndex = entity.loads.indexOf(load) + 1;
      const nextLoad = entity.loads[nextLoadIndex];
      const nextStopIndex = load.stops.indexOf(stop) + 1;
      const nextStop = load.stops[nextStopIndex];
      if (nextStop && !nextStop.actions[0].delayReport) {
        const nextCheckIn = nextStop?.actions?.find(gate => gate.type === "CHECKIN" && !gate.actualTime);
        if (asset && nextCheckIn) {
          //console.log(licensePlateId);
          const aaid = asset.asset.aaid; // Extract the AAID
          const positionData = await fetchLatestPositionData(aaid, vrid, tourId); // Fetch the position data
          if (positionData) {
            const originLatitude = positionData.latitude;
            const originLongitude = positionData.longitude;
            const etaData = await fetchMatrixETA(
              originLatitude,
              originLongitude,
              nextStop.location?.latitude,
              nextStop.location?.longitude,
              action);
            if (etaData) {
              const { etaTime } = etaData;
              const scheduledTime = new Date(nextCheckIn.plannedTime);
              const { days, minutes, seconds } = getLiveISOTimeDifference(positionData.timestamp, timeZone) // This will be in ISO format
              const timeAgoText = days > 0 ? `${days} day${days > 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''} ago` : minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''} ago` : seconds < 30 ? "a few seconds ago" : `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
              const formattedScheduledTime = formatISODate(scheduledTime.toISOString(), timeZone);
              const formattedEtaTime = formatISODate(etaTime.toISOString(), timeZone);
              console.log(`Scheduled Time: Sch. ${formattedScheduledTime}, Estimated Time: Sch. ${formattedEtaTime}`);
              const delay = calculateDelay(etaTime, scheduledTime);
              if (etaTime > scheduledTime) {
                showNotification(
                  `Report Delay at Block: ${entity.resourceBlock?.id || entity.id}, VRID: <strong>${load.versionedLoadId.id} & ${nextLoad.versionedLoadId.id}</strong> , Driver: <strong>${driver?.firstName} ${driver?.lastName}</strong> will arrive late at Stop <strong>${nextStop.locationCode}</strong> by <strong>${delay.hours} hrs, ${delay.minutes} mins. </strong> - Last updated: (${timeAgoText})`,
                  'danger'
                );
              } else {
                // Log if the driver is early
                const earlyBy = calculateDelay(scheduledTime, etaTime);
                console.log(
                  `Driver: ${driver?.firstName} ${driver?.lastName} is arriving early at Stop ${nextStop.locationCode} by ${earlyBy.hours} hrs, ${earlyBy.minutes} mins. - Last updated: (${timeAgoText})`);
              }
            }
          }
          else {
            console.log(`No position data found for AAID: ${aaid}`);
          }
        }
      }
    }
  }
}
const fetchMatrixETA = async (originLat, originLon, destLat, destLon, action) => {
  const API_KEY = "2zmTHgjtCcIz_QtE0j1Rq9OGbusyzG7FhbnuduOgGoM"; // Replace with your actual API key
  const departureTime = new Date().toISOString();
  const url = `https://matrix.router.hereapi.com/v8/matrix?async=false&apikey=${API_KEY}`;
  const requestBody = {
    origins: [{ lat: originLat, lng: originLon }],
    destinations: [{ lat: destLat, lng: destLon }],
    "routingMode": "fast",
    "transportMode": "truck",
    regionDefinition: {
      type: "world"
    },
    matrixAttributes: ["travelTimes", "distances"],
    departureTime: departureTime
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      const duration = data.matrix.travelTimes[0]; // Duration in seconds
      const distance = data.matrix.distances[0]; // Distance in meters

      // Convert duration to a Date for ETA calculation
      const etaTime = new Date(Date.now() + duration * 1000);

      //console.log(`ETA Duration: ${duration / 60} minutes`);
      //console.log(`Distance: ${distance} ${distance / 1000} km ${distance * 0.000621371} miles`);
      //console.log(`Estimated Arrival Time: ${etaTime}`);

      return {
        duration,
        distance,
        etaTime
      };
    } else {
      throw new Error(`Failed to fetch ETA: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error fetching matrix ETA:", error);
  }
};



function calculateDelay(time1, time2) {
  const diffMs = Math.abs(time1 - time2);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
}
/**
 * Checks if the driver has arrived at the stop and notifies if they haven't.
 * The function is called for each action in the stop, and it checks if the
 * action's actualTime is null. If it is, it checks if any later stop has a
 * valid timestamp. If no later stop has a valid timestamp, it checks if the
 * planned time is within 10 minutes. If it is, it shows a notification.
 * If the driver has arrived, it checks if the Stop ID has already been alerted,
 * and if not, it shows a notification and marks the Stop ID as alerted.
 * @param {object} load - The current load object.
 * @param {object} stop - The current stop object.
 * @param {object} action - The current action object.
 * @param {object} originalEntity - The original Tour entity object.
 * @param {object} driver - The driver object containing the driver's first and last name.
 * @param {array} _STOPSALERTS - The array of Stop IDs that have been alerted.
 */
const checkMissingTimestamps = (load, stop, action, originalEntity, driver, _STOPSALERTS, hasLaterTimestamps) => {
  //CHECK IF DRIVER ARRIVED OR IT'S A MISSING TIMESTAMP
  // Ensure trip is not cancelled and the action is either CHECKIN or CHECKOUT
  if (!load.cancelTime && (action.type === "CHECKIN" || action.type === "CHECKOUT")) {
    // Skip if this is the last stop and the action is the second action, but the actual time is still null
    if (stop === load.stops[load.stops.length - 1] && action === stop.actions[1] && action.actualTime === null) {
      return;
    }

    if (action.actualTime === null) {

      // Check if any later stop has a valid timestamp
      for (const laterStop of load.stops.slice(load.stops.indexOf(stop) + 1)) {
        for (const laterAction of laterStop.actions) {
          if (laterAction.actualTime !== null) {
            hasLaterTimestamps = true;
            break;
          }
        }
        if (hasLaterTimestamps) break;
      }

      if (!hasLaterTimestamps) {
        // Driver hasn't arrived, check if the planned time is within 10 minutes
        const now = new Date();
        const plannedTime = new Date(action.plannedTime);
        const timeDifferenceInMinutes = (plannedTime - now) / (1000 * 60);

        if (timeDifferenceInMinutes <= 10 && timeDifferenceInMinutes > 0) {
          // Alert: Driver hasn't arrived, and the planned time is less than 10 minutes away
          if (!_STOPSALERTS.includes(stop.stopId)) {
            showNotification(
              `Driver: ${driver?.firstName} ${driver?.lastName} hasn't arrived at Stop ${stop.locationCode}, and it's less than 10 minutes to the scheduled planned time (${formatISODate(action.plannedTime, stop.location.timeZone)})!`,
              'danger'
            );
            // Mark this Stop ID as alerted
            _STOPSALERTS.push(stop.stopId);
            localStorage.setItem('_STOPSALERTS', JSON.stringify(_STOPSALERTS));
          }
        }
      } else {
        if (!_STOPSALERTS.includes(stop.stopId)) {
          showNotification(
            `(Block: ${originalEntity.resourceBlock?.id || originalEntity.id}, VRID: ${load.versionedLoadId.id})\nStop ${stop.locationCode} might be missing the timestamp, but the Driver: ${driver?.firstName} ${driver?.lastName} has moved on.`,
            'warning'
          );
          // Mark this Stop ID as alerted
          _STOPSALERTS.push(stop.stopId);
          localStorage.setItem('_STOPSALERTS', JSON.stringify(_STOPSALERTS));
        }
      }
    }
  }
};

//TODO: Check Checkout time and compare it with Current time & If load type is EMPTY and check out has not occured before 30 mins notify to check with driver & if check out prior by 5 mins and load is loaded notify the driver.


/**
 * Checks the checkout status of the first stop in a load and alerts the user if the driver has not checked out within a certain time window.
 * For EMPTY loads, it notifies if the driver has not checked out 30 minutes before the scheduled checkout time.
 * For LOADED loads, it notifies if the driver has not checked out 5 minutes before the scheduled checkout time.
 * @param {object} load - The load object containing the stops.
 * @param {object} stop - The stop object containing the actions.
 * @param {object} driver - The driver object containing the driver's first and last name.
 */
const checkCheckoutStatus = (originalEntity, load, stop, driver) => {
  // Ensure we're processing stop[0] & Ensure the load is not cancelled
  if (load.stops.indexOf(stop) !== 0) return;
  if (load.cancelTime) return;

  // Ensure CHECKIN action at stop[0] has been performed and is from "YMS"
  const CHECKIN_ACTION = stop.actions.find(action => action.type === "CHECKIN" && action.actualTimeSource === "YMS");
  if (!CHECKIN_ACTION || !CHECKIN_ACTION.actualTime) return;

  const CHECKOUT_ACTION = stop.actions.find(action => action.type === "CHECKOUT");
  if (!CHECKOUT_ACTION || CHECKOUT_ACTION.actualTime) return; // Skip if no CHECKOUT action or already checked out

  const currentTime = new Date();
  const plannedCheckoutTime = new Date(CHECKOUT_ACTION.plannedTime);
  const timeDifferenceMinutes = (plannedCheckoutTime - currentTime) / (1000 * 60); // Time until checkout in minutes

  const NOTIFICATIONS_LOG = JSON.parse(localStorage.getItem('_CHECKOUT_ALERTS')) || [];

  // For EMPTY loads, notify if checkout hasn't occurred and it's 30 minutes before scheduled checkout
  if (load.loadType === "EMPTY" && timeDifferenceMinutes <= 30) {
    if (!NOTIFICATIONS_LOG.includes(`${stop.stopId}-EMPTY`)) {
      showNotification(
        `Block: ${originalEntity.resourceBlock?.id || originalEntity.id} VRID: ${load?.versionedLoadId?.id}\n
              Driver: <strong>${driver?.firstName} ${driver?.lastName}</strong> at Stop ${stop.locationCode} has not checked out and is <strong>30 minutes</strong> before the scheduled time. Verify if the <strong>EMPTY</strong> load has been hooked.`,
        "warning"
      );
      NOTIFICATIONS_LOG.push(`${stop.stopId}-EMPTY`);
    }
  }

  // For LOADED loads, notify if checkout hasn't occurred and it's 5 minutes before scheduled checkout
  if (load.loadType === "LOADED" && timeDifferenceMinutes <= 5) {
    if (!NOTIFICATIONS_LOG.includes(`${stop.stopId}-LOADED`)) {
      showNotification(
        `Block: ${originalEntity.resourceBlock?.id || originalEntity.id} VRID: ${load?.versionedLoadId?.id}\n
              Driver: <strong>${driver?.firstName} ${driver?.lastName}</strong> at Stop ${stop.locationCode} has not checked out and is <strong>5 minutes</strong> before the scheduled time. Contact ROC and arrange for the driver to bobtail out.`,
        "danger"
      );
      NOTIFICATIONS_LOG.push(`${stop.stopId}-LOADED`);
    }
  }

  // Save updated notifications log to prevent duplicate alerts
  localStorage.setItem('_CHECKOUT_ALERTS', JSON.stringify(NOTIFICATIONS_LOG));
};
/***
 * Checks if there are any changes in the actual or planned timestamps for the given action and alerts if there are any changes.
 * @param {object} action - The action object.
 * @param {object} originalAction - The original action object before any changes.
 * @param {object} stop - The stop object.
 * @param {object} originalEntity - The original Tour entity object.
 * @param {object} load - The current load object.
 * @param {object} driver - The driver object containing the driver's first and last name.
 */
const checkArrivalandDeparture = (action, originalAction, originalLoad, load, stop, originalEntity, driver) => {
  const actionChecks = [`actualTime`, `plannedTime`];
  for (const field of actionChecks) {
    if (action[field] !== originalAction[field]) {
      switch (field) {
        case 'plannedTime': showNotification(`Amazon changed the Planned Time: Block ID ${originalEntity.resourceBlock?.id || originalEntity.id} (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id} from ${formatISODate(originalAction[field], stop.location.timeZone)} to ${formatISODate(action[field], stop.location.timeZone)}`, 'danger');
          break;
        case 'actualTime':
          if (action.type === 'CHECKIN') {
            showNotification(`Driver: ${driver?.firstName} ${driver?.lastName} checked in on ${originalEntity.resourceBlock?.id || originalEntity.id} (Stop: ${stop.locationCode}), VRID ${load.versionedLoadId.id} at ${formatISODate(action[field], stop.location.timeZone)} via ${action.actualTimeSource}`, 'arrival');
          }
          else if (action.type == 'CHECKOUT') {
            showNotification(`Driver: ${driver?.firstName} ${driver?.lastName} checked out on ${originalEntity.resourceBlock?.id || originalEntity.id} (Stop: ${stop.locationCode}), VRID ${load.versionedLoadId.id} at ${formatISODate(action[field], stop.location.timeZone)} via ${action.actualTimeSource}`, 'departure');
          }
          break;
        default:
          showNotification(
            `Block: ${originalEntity.resourceBlock?.id || originalEntity.id} Changed!\n` +
            `${field} on load ${load.versionedLoadId.id} of type: ${action.type} Changed\n` +
            `From ${originalAction[field]} to ${action[field]}`,
            'info');
          break;
      }
    }
  }
}

/**
 * Checks if the trailer at the current stop has finished loading and sends a notification if it has.
 * This function compares the trailer loading status of the current stop with the original stop.
 * If the status has changed to "FINISHED_LOADING", it sends a notification and marks the stop as alerted.
 *
 * @param {object} originalEntity - The original Tour entity object.
 * @param {object} load - The current load object.
 * @param {object} originalLoad - The original load object for comparison.
 * @param {object} originalStop - The original stop object before any changes.
 * @param {object} stop - The current stop object.
 * @param {object} driver - The driver object containing the driver's first and last name.
 */
const checkTrailerLoadingStatus = (originalEntity, load, originalLoad, originalStop, stop, driver) => {
  //TODO: Ensure only one stop which is CHECKIN Action is being processed
  const _LOADREADYSALERTS = JSON.parse(localStorage.getItem('_LOADREADYSALERTS')) || [];
  if (stop.trailerDetails[0].trailerLoadingStatus !== originalStop.trailerDetails[0].trailerLoadingStatus &&
    stop.trailerDetails[0].trailerLoadingStatus === `FINISHED_LOADING`) {
    if (!_LOADREADYSALERTS.includes(stop.stopId)) {
      // Format the driver's first name
      const formattedFirstName = formatFirstName(driver?.firstName);

      showNotification(
        `Load has finished loading: Block ID ${originalEntity.resourceBlock?.id || originalEntity.id} (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id}\n
          Driver: ${formattedFirstName} at site ${stop.locationCode}, Load: ${stop.trailerDetails[0].assetOwner}-${stop.trailerDetails[0].assetId} is ready for pickup
        `,
        'LoadReady');
      _LOADREADYSALERTS.push(stop.stopId);
      localStorage.setItem('_LOADREADYSALERTS', JSON.stringify(_LOADREADYSALERTS));
    }
  }
};
/**
 * Cleans up the stored notes by removing entries that are not present in the original entities.
 * Iterates over the stored notes and checks if each note's entity ID is still present in the current set of original entities.
 * If an entity ID is not found, it deletes that entry from the stored notes.
 * After cleanup, updates the local storage with the modified stored notes.
 *
 * @param {object} allStoredNotes - The object containing all stored notes, keyed by entity ID.
 * @param {object[]} originalEntities - Array of current tour entities, each containing an ID.
 */
const cleanUpStoredNotes = (allStoredNotes, originalEntities) => {
  const entityIds = Object.keys(allStoredNotes); // Get all stored entity IDs
  entityIds.forEach(id => {
    if (!originalEntities.some(entity => entity.id === id)) {
      // If the current entities don't contain this entity ID, remove it from storage
      delete allStoredNotes[id];
    }
  });
  localStorage.setItem('ALLNOTES', JSON.stringify(allStoredNotes));
};
/**
 * Sends a POST request to the API endpoint to fetch the tour entities.
 * The request payload includes the search criteria such as stages, start date, and load type filters.
 * The response is processed by the processEntities function, which compares the current entities with the original entities
 * and sends notifications for any discrepancies.
 * @returns {Promise<void>}
 */
let CPS = 1;
const startProcess = async () => {
  console.log(`Sending request...Calls This Session: ${CPS}`);
  let originalEntities = localStorage.getItem("originalEntities");
  //console.log(originalEntities);
  originalEntities = originalEntities ? JSON.parse(originalEntities) : [];
  //CompanySCAC = originalEntities?.loads[0]?.carrierId;
  const _STOPSALERTS = JSON.parse(localStorage.getItem('_STOPSALERTS')) || [];
  try {
    await fetchAssets();
    const data = await fetchTours();
    processEntities(data.entities, originalEntities, _STOPSALERTS);
    CPS++;
  } catch (error) {
    console.error("Request failed:", error);
  }
};

// Function to process the entities data (add your logic here)

const processEntities = async (entities, originalEntities, _STOPSALERTS) => {
  if (!originalEntities) {
    originalEntities = entities || [];
    return;
  }
  let responseEntities = entities || [];
  for (const entity of responseEntities) {
    const originalEntity = originalEntities.find((item) => item.id === entity.id);

    if (!originalEntity) {
      continue;
    }
    const loads = entity.loads || [];
    const driver = entity.drivers[0];
    compareAndNotifyLoadChanges(driver, originalEntity, loads);
    checkFacilitySequenceGaps(driver, entity, loads);

    for (const load of loads) {
      let hasLaterTimestamps = false;
      const originalLoad = originalEntity.loads.find((item) => item.versionedLoadId.id === load.versionedLoadId.id);
      if (!originalLoad) {
        continue;
      }
      //await
      fetchNotes(entity, load, entity.id, entity.version);
      checkStopDelays(entity, load)
      checkAndNotifyLoadChanges(load, originalLoad, originalEntity, driver);
      for (const stop of load.stops) {
        const originalStop = originalLoad.stops.find((item) => item.stopId === stop.stopId);
        if (!originalStop) {
          continue;
        }
        checkCheckoutStatus(originalEntity, load, stop, driver);
        ///Done:check if trailer has finished loading
        checkTrailerLoadingStatus(originalEntity, load, originalLoad, originalStop, stop, driver);
        for (const action of stop.actions) {
          const originalAction = originalStop.actions.find((item) => item.type === action.type);
          checkMissingTimestamps(load, stop, action, originalEntity, driver, _STOPSALERTS, hasLaterTimestamps);
          calculateLiveETA(entity, load, stop, action, driver, hasLaterTimestamps)
          checkArrivalandDeparture(action, originalAction, originalLoad, load, stop, originalEntity, driver);
        }
      }
    }
  }
  originalEntities = entities || [];
  localStorage.setItem("originalEntities", JSON.stringify(originalEntities));
  cleanUpStoredNotes(allStoredNotes, originalEntities);
}
//Execute:

(function () {
  console.log("Script run!");
  addClearNotificationsAndETACheckbox();
  setInterval(startProcess, 30000);
  startProcess()
})()
