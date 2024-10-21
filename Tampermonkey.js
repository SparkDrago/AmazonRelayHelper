// ==UserScript==
// @name         Amazon Relay Notifications Fetcher
// @namespace    http://tampermonkey.net/
// @version      Beta-V0.4-(10/10/2024)
// @description  Display custom notifications on Amazon Relay dashboard
// @author       SparkDrago, Yamazo, StarkTheGnr
// @match        https://relay.amazon.com/*
// @icon         https://lh3.googleusercontent.com/AIuLy2qRt1BgjSQRgCw-GeEDxKrh8UeMtJs25HH-Z7cMfnd8NkM6gFdExO_2WEpRp_U=s180
// @grant        GM.xmlHttpRequest
// ==/UserScript==

"use strict";
const allStoredNotes = JSON.parse(localStorage.getItem('ALLNOTES')) || {};
//TODO: Add a way to add cookies to the request
//TODO: Add a way to save CsrfToken of the session to local storage. so only one visit to amazon Realay is needed.
//Cookies:
const requestCookie = `sess-time-owpus=2082787201l; ubid-owpus=131-0494391-6521244; i18n-prefs=USD; sp-cdn="L5Z9:EG"; sid="jafcvoxIiI3FGm3JfU/4Xw==|EsT32G1gOQoK0IFb49RO3Xob7kyflHLCWr53y/DmnP8="; regStatus=pre-register; aws-target-visitor-id=1727915523093-679468; aws-target-data=%7B%22support%22%3A%221%22%7D; AMCV_7742037254C95E840A4C98A6%40AdobeOrg=1585540135%7CMCIDTS%7C20000%7CMCMID%7C42974595939689291731437136935827997618%7CMCAID%7CNONE%7CMCOPTOUT-1727923029s%7CNONE%7CvVersion%7C4.4.0; ubid-main=131-0494391-6521244; _pendo_visitorId.28a24577-c7fa-4d0c-52b2-e8a706b20b8b=AER50A9Q6S6XT; _pendo_accountId.28a24577-c7fa-4d0c-52b2-e8a706b20b8b=0371531e-5112-46bb-9fc0-e02f7f62fc4a; _pendo___sg__.28a24577-c7fa-4d0c-52b2-e8a706b20b8b=%7B%22visitormetadata%22%3A%7B%22agent__useragent%22%3A%22Mozilla%2F5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F129.0.0.0%20Safari%2F537.36%20Edg%2F129.0.0.0%22%7D%7D; sess-id-owpus=138-5976922-9582218; _pendo_meta.28a24577-c7fa-4d0c-52b2-e8a706b20b8b=4036634963; lc-acbuk=en_US; AMCV_D250623D5E59623C0A495C6C%40AdobeOrg=-637568504%7CMCIDTS%7C20006%7CMCMID%7C87226288098684581851450313745747616791%7CMCAID%7CNONE%7CMCOPTOUT-1728488666s%7CNONE%7CvVersion%7C5.1.1; session-id=145-1662146-9279037; session-token="a15wP01LR6v7p3BfgwhuR7hf2N9icCLmHGeCr6gnjXzXHtUfH1BfNY5yd5yBvDFKstCrlzLCvHu0UIM4ckcmDFUGRvJXGGC99K9OWXEt39gC4gaPU2OmnRBrckqjLfM8uwXFUkMPOX5hBWeCjFiytttZMJgQBAWNY8PmxFrfFvAfQzRysPG334wI9CCMRIpCIqZeTIBiTdVj0DhDxxO8oqphzL2VQrCmrjCaSsW/8p4epxpAxP3uUKHbMUtzBqNZNFhCKxH6JIqiEXYzmCtZ14EkDck9uaa/HCVjyyEbwfIj/tusgmpZP0DoTvndnu6OTiP/g6lWo6cfHK5SggoRBsGq4FPcCOCPxXgegUvsUY5CQ/aHz6px3g=="; x-owpus="0pqQly04qp8JGWTpJqsUZVWNKflQJiB519EA678dF@cYqAIIWXOwrv?X7uFyY0nf"; at-owpus=Atza|IwEBIO_oOkPm0wgrn0wA4xaz9Z-vLsnwFO1p2fGw8Ch6vfwX3jR_EHcFkWAwIMa-OJejgWSgLUpY5j18b8f1d7pt2LK6N0nurZq1E3Vc5jAbzDnKjsgOufSW0bijeNgxXBcImALDH2seUGCzvV5uTiukYkCah67tP5yz1o4Vuuj_wD7aFdHXVFaE687Y4KHbhFVQ1X0hMcFxK-MyltJAy0bw8YV7fWfeWAeEK2LJJ9hWdNtnWg; sess-at-owpus="aQ5P1x78Bqq6pVyg+fyX5VXxZzn78c/+e8bfgX8XWLw="; sess-token-owpus=1gspKj3L9NUS93538fnEgZQcazIBK8ttpD+HjH4U1Z+ztiC/oahNekhL+C1FsslxgP6nppNP+h/GzKGTGFe504k/4P4KTEN2ABT8S6cxuqM1GzwLCOkHAphuQnP/0e3PSY3DGnDzU19ixSiwVmUGdauAIrbO7AbCy6SBxCnQHxIF3PPX+i3EWSsaQU21MDMTpmHzqExVk/zx1Nd4Al9B3iLmz/iANpFAfDg2ZElnfuJkWpxR0g2Go3x9Te9Ytsyl53rJU8JyGtQmV23GhGghLbQAqXFchVmBN1V7wsPyE3PTsFn5Q2KHiDnIVUzKgNQDzR1WD/i0uj+8e+CEbIXPwq4og80Fv3iBwIRJ0xU/Wzj9mmjSe8WsBYOgIfur1UUr; session-id-time=2082787201l; csm-hit=tb:s-ZFE7PAZ0GX2CN5B1NKWG|1728520917741&t:1728520918246&adb:adblk_yes`; // Dynamic cookies        "Host": "relay.amazon.com",
const NoteCookie = `sess-time-owpus=2082787201l; ubid-owpus=131-0494391-6521244; i18n-prefs=USD; sp-cdn="L5Z9:EG"; sid="jafcvoxIiI3FGm3JfU/4Xw==|EsT32G1gOQoK0IFb49RO3Xob7kyflHLCWr53y/DmnP8="; regStatus=pre-register; aws-target-visitor-id=1727915523093-679468; aws-target-data=%7B%22support%22%3A%221%22%7D; AMCV_7742037254C95E840A4C98A6%40AdobeOrg=1585540135%7CMCIDTS%7C20000%7CMCMID%7C42974595939689291731437136935827997618%7CMCAID%7CNONE%7CMCOPTOUT-1727923029s%7CNONE%7CvVersion%7C4.4.0; ubid-main=131-0494391-6521244; _pendo_visitorId.28a24577-c7fa-4d0c-52b2-e8a706b20b8b=AER50A9Q6S6XT; _pendo_accountId.28a24577-c7fa-4d0c-52b2-e8a706b20b8b=0371531e-5112-46bb-9fc0-e02f7f62fc4a; _pendo___sg__.28a24577-c7fa-4d0c-52b2-e8a706b20b8b=%7B%22visitormetadata%22%3A%7B%22agent__useragent%22%3A%22Mozilla%2F5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F129.0.0.0%20Safari%2F537.36%20Edg%2F129.0.0.0%22%7D%7D; sess-id-owpus=138-5976922-9582218; _pendo_meta.28a24577-c7fa-4d0c-52b2-e8a706b20b8b=4036634963; lc-acbuk=en_US; AMCV_D250623D5E59623C0A495C6C%40AdobeOrg=-637568504%7CMCIDTS%7C20006%7CMCMID%7C87226288098684581851450313745747616791%7CMCAID%7CNONE%7CMCOPTOUT-1728488666s%7CNONE%7CvVersion%7C5.1.1; session-id=145-1662146-9279037; session-token="a15wP01LR6v7p3BfgwhuR7hf2N9icCLmHGeCr6gnjXzXHtUfH1BfNY5yd5yBvDFKstCrlzLCvHu0UIM4ckcmDFUGRvJXGGC99K9OWXEt39gC4gaPU2OmnRBrckqjLfM8uwXFUkMPOX5hBWeCjFiytttZMJgQBAWNY8PmxFrfFvAfQzRysPG334wI9CCMRIpCIqZeTIBiTdVj0DhDxxO8oqphzL2VQrCmrjCaSsW/8p4epxpAxP3uUKHbMUtzBqNZNFhCKxH6JIqiEXYzmCtZ14EkDck9uaa/HCVjyyEbwfIj/tusgmpZP0DoTvndnu6OTiP/g6lWo6cfHK5SggoRBsGq4FPcCOCPxXgegUvsUY5CQ/aHz6px3g=="; x-owpus="0pqQly04qp8JGWTpJqsUZVWNKflQJiB519EA678dF@cYqAIIWXOwrv?X7uFyY0nf"; at-owpus=Atza|IwEBIO_oOkPm0wgrn0wA4xaz9Z-vLsnwFO1p2fGw8Ch6vfwX3jR_EHcFkWAwIMa-OJejgWSgLUpY5j18b8f1d7pt2LK6N0nurZq1E3Vc5jAbzDnKjsgOufSW0bijeNgxXBcImALDH2seUGCzvV5uTiukYkCah67tP5yz1o4Vuuj_wD7aFdHXVFaE687Y4KHbhFVQ1X0hMcFxK-MyltJAy0bw8YV7fWfeWAeEK2LJJ9hWdNtnWg; sess-at-owpus="aQ5P1x78Bqq6pVyg+fyX5VXxZzn78c/+e8bfgX8XWLw="; sess-token-owpus=1gspKj3L9NUS93538fnEgZQcazIBK8ttpD+HjH4U1Z+ztiC/oahNekhL+C1FsslxgP6nppNP+h/GzKGTGFe504k/4P4KTEN2ABT8S6cxuqM1GzwLCOkHAphuQnP/0e3PSY3DGnDzU19ixSiwVmUGdauAIrbO7AbCy6SBxCnQHxIF3PPX+i3EWSsaQU21MDMTpmHzqExVk/zx1Nd4Al9B3iLmz/iANpFAfDg2ZElnfuJkWpxR0g2Go3x9Te9Ytsyl53rJU8JyGtQmV23GhGghLbQAqXFchVmBN1V7wsPyE3PTsFn5Q2KHiDnIVUzKgNQDzR1WD/i0uj+8e+CEbIXPwq4og80Fv3iBwIRJ0xU/Wzj9mmjSe8WsBYOgIfur1UUr; session-id-time=2082787201l; csm-hit=tb:JQT9V55X8VSMEG29TAJS+s-RRBJCN962R7S8GHY2WPT|1728520987007&t:1728520987007&adb:adblk_yes`;
//Functions:



const getCsrfToken = () => {
  const metaTag = document.querySelector('meta[name="x-owp-csrf-token"]');
  return metaTag ? metaTag.getAttribute("content") : null;
};
/**
 * Takes an ISO date string and formats it to a short date string (e.g. "Oct 4, 11:45 PM")
 * @param {string} isoDateString - ISO-formatted date string
 * @returns {string} short date string
 */
const formatISODate = (isoDateString) => {
  // Create a new Date object from the ISO string
  const date = new Date(isoDateString);

  // Options for formatting
  const options = {
    day: "numeric",
    month: "short",
    hour: "numeric", // Numeric for 24-hour format
    minute: "2-digit",
    hour12: false, // false for 24-hour format
    timeZone: "America/New_York", // Change to your desired timezone
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
const getLiveTimeDifference = (isoDateString) => {
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
 * @param {string} [type='info'] - The type of notification (info, success, warning, danger, note).
 */
const showNotification = (body, type = "info") => {
  console.log(body);
  const notificationId = `notification-${Date.now()}`;

  // Define colors based on type (info, success, warning, danger)
  const typeStyles = {
    success: { background: "#dbf6d3", border: "#aed4a5", color: "#569745" },
    info: { background: "#d9edf7", border: "#98cce6", color: "#3a87ad" },
    warning: { background: "#fcf8e3", border: "#f1daab", color: "#c09853" },
    danger: { background: "#f2dede", border: "#e0b1b8", color: "#b94a48" },
    note: { background: "#f5f5f5", border: "#dcdcdc", color: "#666666" },
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
        display: inline-block;
        vertical-align: middle;
        width: 25px;
        height: 25px;
        text-align: center;
        background-color: ${typeStyles[type].color};
        border-radius: 50%;
        color: white;
        margin-right: 15px;
    ">
    <i class="fa ${
      type === "success"
        ? "fa-check"
        : type === "info"
        ? "fa-info-circle"
        : type === "warning"
        ? "fa-warning"
        : type === "danger"
        ? "fa-times-circle"
        : "fa-sticky-note"
    }"></i>
    </div>
    <strong>${
      type.charAt(0).toUpperCase() + type.slice(1)
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
const playSound = (type) => {
  let soundUrl;

  switch (type) {
    case "success":
      soundUrl = "https://www.sndup.net/6h5j5/d";
      break;
    case "info":
      soundUrl = "https://www.sndup.net/tkyxj/d";
      break;
    case "warning":
      soundUrl = "https://www.sndup.net/zqgmd/d";
      break;
    case "danger":
      soundUrl = "https://www.sndup.net/xzzst/d";
      break;
    case "note":
      soundUrl = "https://www.sndup.net/86qqz/d";
      break;
    default:
      soundUrl = "https://www.sndup.net/6h5j5/d"; 
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

async function fetchNotes(entity,load,entityId, entityVersion) {
    console.log("Sending note request...");

    try {
        const csrfToken = getCsrfToken();

        const response = await fetch(`https://relay.amazon.com/api/tours/tours/${entityId}/${entityVersion}/notes`, {
            method: "GET",
            headers: {
                Accept: "application/json, text/plain, */*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
                Connection: "keep-alive",
                Cookie: NoteCookie,
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
        processNotes(entity,load,entityId, currentNotes);

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
function processNotes(entity,load,entityId, currentNotes) {
    // Step 2: Retrieve all stored notes from local storage

    // Step 3: Compare current notes with original notes for this specific entity
    const originalNotes = allStoredNotes[entityId] || [];
    // Create an array to store new notes for this entity
    const newNotes = [];

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
        const { days, minutes, seconds } = getLiveTimeDifference(newNote.createdDate);
        const timeAgoText =
            days > 0 ? `${days} day${days > 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''} ago` :
            minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}, ${seconds} second${seconds !== 1 ? 's' : ''} ago` :
            seconds < 30 ? "less than 30 seconds ago" : `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
        // Show a notification for each new note, including the time difference
        showNotification(
            `Block: ${entity.resourceBlock.id} VRID: ${newNote.loadId} Driver: ${load.driverList[0].firstName} ${load.driverList[0].lastName}, A New Note was added by ${newNote.scac} ${timeAgoText}:\n"${newNote.note}"`,
            `note`
        );
    }

    // Step 5: Update the stored notes for this specific entity
    allStoredNotes[entityId] = currentNotes;
    // Step 6: Save the updated notes for all entities in local storage
}
//Logic:
async function sendRequest() {
  console.log("Sending request...");
  let originalEntities = localStorage.getItem("originalEntities");
  console.log(originalEntities);
  originalEntities = originalEntities ? JSON.parse(originalEntities) : [];
  const _STOPSALERTS = JSON.parse(localStorage.getItem('_STOPSALERTS')) || [];

  try {
    const csrfToken = getCsrfToken();
    const response = await fetch(
      "https://relay.amazon.com/api/tours/entities",
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Cookie: requestCookie, //TODO: Replace with Dynamic cookie
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
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    //console.log("Response received:", data);

    // Process the response data here...
    processEntities(data.entities, originalEntities, _STOPSALERTS)
  } 
  catch (error) {
    console.error("Request failed:", error);
  }
}
// Function to process the entities data (add your logic here)
function processEntities(entities, originalEntities, _STOPSALERTS) {
    if (!originalEntities) {
        originalEntities = entities || [];
        return;
    }

    let responseEntities = entities || [];
    const actionChecks = [`actualTime`, `plannedTime`];
    const loadChecks = [
    `loadType`,
    `facilitySequence`,
    `isEBOLRequired`,
    `areNotesPresent`,
    `physicalTrailerId`
    ];
    for (const entity of responseEntities) {
        const originalEntity = originalEntities.find((item) => item.id === entity.id);
        
        if (!originalEntity) {
            continue;
        }
        const loads = entity.loads || [];

        /*
        Check if the number of loads in the current entity is different from the number of loads in the original entity
        *If it is, find the larger and smaller of the two arrays
        *The larger array will have the complete list of loads, and the smaller array will be missing some loads
        */
        if (loads.length !== originalEntity.loads.length) {
            // If the original entity has more loads than the current entity, use the original entity's loads array
            // Otherwise, use the current entity's loads array
            const largerLoad  = originalEntity.loads.length > loads.length ? originalEntity.loads : loads;
            // If the original entity has fewer loads than the current entity, use the original entity's loads array
            // Otherwise, use the current entity's loads array
            const smallerLoad = originalEntity.loads.length < loads.length ? originalEntity.loads : loads;
            // Find the loads that are present in the larger array but not in the smaller array
            // This will give us the loads that were added or removed from the entity
            const changedLoads = largerLoad.filter((item) => {
            // For each item in the larger array, check if there is no item in the smaller array
            // with the same versionedLoadId.id. If there isn't, that means the load was added or removed    
                return !smallerLoad.find((smallerItem) => item.versionedLoadId.id === smallerItem.versionedLoadId.id);    
            });
            // Find the first driver in the original entity's resource block (assuming there's only one driver)
            const driver = originalEntity.resourceBlock.drivers[0];
            // Get the driver's full name
            const driverFullName = `${driver.firstName} ${driver.lastName}`;
            // If there are any changed loads, show a notification with the following format:
            // "Loads were altered on <driver name>'s trip; Block ID: <block ID>. The following loads' VRIDs were either added or removed: <list of changed VRIDs>"
            showNotification(
                `Loads were altered on ${driverFullName}'s trip; ` +
                    `Block ID: ${originalEntity.resourceBlock.id}. ` +
                    `The following loads' VRIDs were either added or removed: ` +
                    `${changedLoads
                    .map((item) => item.versionedLoadId.id)
                    .join(", ")}`,`warning`
                );
        }
        // Iterate over the loads in the current entity
        for (const load of loads) {
            // Check for new notes while we're at it
            fetchNotes(entity,load,entity.id, entity.version);
            localStorage.setItem('ALLNOTES', JSON.stringify(allStoredNotes));
            // For each load, find the corresponding load in the original entity
            const originalLoad = originalEntity.loads.find((item) => item.versionedLoadId.id === load.versionedLoadId.id);
            // If the load is not present in the original entity, skip it
            if (!originalLoad) {
                continue;
            }
            // Iterate over the fields that we want to check for changes
            for (const field of loadChecks) {
                // If the value of the field has changed, show a notification
                if (load[field] !== originalLoad[field]) {
                    if (field === 'areNotesPresent') {
                        showNotification(`A new note was added on a VRID with no notes: Block ID ${originalEntity.resourceBlock.id} (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id}}`, 'info');
                    }
                    else if (field === 'loadType') {
                        showNotification(`Load Type Changed: Block ID ${originalEntity.resourceBlock.id} (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id}}`, 'danger');
                        if(load[field] !== "BOBTAIL" && load.physicalTrailerId){
                            showNotification(`Trailer Assigned to VRID: Block ID ${originalEntity.resourceBlock.id} (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id}}: ${load.physicalTrailerId}`, 'warning');
                        }
                    }
                    else if (field === `isEBOLRequired`) {
                        showNotification(`NEW LOADED TRAILER WITH A BOL REQUIREMENT: Block ID ${originalEntity.resourceBlock.id} (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id}}`, 'warning');
                    }
                    else if (field === `isEBOLRequired`) {
                        showNotification(`Block ID ${originalEntity.resourceBlock.id} (Trip: ${originalLoad.facilitySequence}) Changed: ${field} Changed on Load: VRID ${load.versionedLoadId.id} From ${originalLoad[field]} to ${load[field]}`, 'info');
                    }
                }
            }
            for (const stop of load.stops) {
                const originalStop = originalLoad.stops.find((item) => item.stopId === stop.stopId);
                if (!originalStop) {
                    continue;
                }
                for (const action of stop.actions) {
                    const originalAction = originalStop.actions.find((item) => item.type === action.type);
                    const driver = load.driverList[0]
                    
                    //CHECK IF DRIVER ARRIVED OR IT'S A MISSING TIMESTAMP
                    if (action.type === "CHECKIN" || action.type === "CHECKOUT") {
                        if (stop === load.stops[load.stops.length - 1] && action === stop.actions[1] && action.actualTime === null) {
                            continue;
                        }
                        if (action.actualTime === null) {
                            // Found a null actualTime, check if any later stop has a valid timestamp
                            let hasValidLaterAction = false;
                            /*
                            load.stops.indexOf(stop) finds the index of the current stop in the load.stops array.
                            + 1 increments the index to point to the next stop.
                            load.stops.slice(...) returns a new array containing all the stops from the incremented index to the end of the load.stops array.
                            */
                            for (const laterStop of load.stops.slice(load.stops.indexOf(stop) + 1)) {
                                for (const laterAction of laterStop.actions) {
                                    if (laterAction.actualTime !== null) {
                                        // If we find a valid actualTime in a later stop, we can conclude
                                        // that the driver has moved on and we don't need to alert
                                        hasValidLaterAction = true;
                                        break;
                                    }
                                }
                                if (hasValidLaterAction) break;
                            }
                            if (!hasValidLaterAction) {
                                // Driver hasn't arrived at this stop
                                const now = new Date();
                                const plannedTime = new Date(action.plannedTime);
                                const timeDifferenceInMinutes = (plannedTime - now) / (1000 * 60);
                                if (timeDifferenceInMinutes <= 10 && timeDifferenceInMinutes > 0) {
                                    // Alert: Driver hasn't arrived, and the planned time is less than 10 minutes away
                                    if (!_STOPSALERTS.includes(stop.stopId)) {
                                        showNotification(`Driver: ${driver.firstName} ${driver.lastName} hasn't arrived at Stop ${stop.locationCode}, and it's less than 10 minutes to the scheduled planned time (${action.plannedTime})!`, 'danger');
                                        // Mark this Stop ID as alerted
                                        _STOPSALERTS.push(stop.stopId);
                                        localStorage.setItem('_STOPSALERTS', JSON.stringify(_STOPSALERTS));
                                    }
                                }            
                            }
                            else {
                                if (!_STOPSALERTS.includes(stop.stopId)) {
                                    showNotification(`(Block: ${originalEntity.resourceBlock.id}, VRID: ${load.versionedLoadId.id})\nStop ${stop.locationCode} might be missing the timestamp, but the Driver: ${driver.firstName} ${driver.lastName} has moved on.`,'warning');
                                    // Mark this Stop ID as alerted
                                    _STOPSALERTS.push(stop.stopId);
                                    localStorage.setItem('_STOPSALERTS', JSON.stringify(_STOPSALERTS));
                                }
                            }
                        }
                        // TODO: IMPLEMENT CALCULATING ETA TIMEFRAME AND COMPARING IT USING LIVE LOCATION
                    }
                    for (const field of actionChecks) {
                        if (action[field] !== originalAction[field]) {
                            switch (field) {
                                case 'plannedTime': showNotification(`Amazon changed the Planned Time: Block ID ${originalEntity.resourceBlock.id} (Trip: ${originalLoad.facilitySequence}), VRID ${load.versionedLoadId.id} from ${formatISODate(originalAction[field])} to ${formatISODate(action[field])}`,'danger');
                                    break;
                                case 'actualTime':
                                    if (action.type === 'CHECKIN') {
                                        showNotification(`Driver: ${driver.firstName} ${driver.lastName} checked in on ${originalEntity.resourceBlock.id} (Stop: ${stop.locationCode}), VRID ${load.versionedLoadId.id} at ${formatISODate(action[field])} via ${action.actualTimeSource}`, 'success');
                                    }
                                    else if (action.type == 'CHECKOUT'){
                                        showNotification(`Driver: ${driver.firstName} ${driver.lastName} checked out on ${originalEntity.resourceBlock.id} (Stop: ${stop.locationCode}), VRID ${load.versionedLoadId.id} at ${formatISODate(action[field])} via ${action.actualTimeSource}`, 'success');
                                    }
                                    break;
                                default:
                                    showNotification(
                                        `Block: ${originalEntity.resourceBlock.id} Changed!\n` +
                                        `${field} on load ${load.versionedLoadId.id} of type: ${action.type} Changed\n` +
                                        `From ${originalAction[field]} to ${action[field]}`,
                                        'info');
                                    break;
                            }
                        }
                    }
                }
            }
        }
    }
    originalEntities = entities || [];
    localStorage.setItem("originalEntities",JSON.stringify(originalEntities));

}
//Execute:
(function () {
    console.log("Script run!");
    setInterval(sendRequest, 30000);
    sendRequest()
})()
