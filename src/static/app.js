document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Confirmation overlay
  const confirmationOverlay = document.createElement("div");
  confirmationOverlay.className = "confirmation-overlay hidden";
  confirmationOverlay.innerHTML = `
    <div class="confirmation-dialog">
      <p id="confirmation-message"></p>
      <div class="confirmation-actions">
        <button type="button" id="confirmation-yes">Yes</button>
        <button type="button" id="confirmation-no">No</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmationOverlay);

  function askRemoveConfirmation(activityName, participantEmail) {
    return new Promise((resolve) => {
      const messageEl = document.getElementById("confirmation-message");
      const yesBtn = document.getElementById("confirmation-yes");
      const noBtn = document.getElementById("confirmation-no");

      messageEl.textContent = `Remove ${participantEmail} from ${activityName}?`;
      confirmationOverlay.classList.remove("hidden");

      function cleanup() {
        confirmationOverlay.classList.add("hidden");
        yesBtn.removeEventListener("click", onYes);
        noBtn.removeEventListener("click", onNo);
      }

      function onYes() {
        cleanup();
        resolve(true);
      }

      function onNo() {
        cleanup();
        resolve(false);
      }

      yesBtn.addEventListener("click", onYes);
      noBtn.addEventListener("click", onNo);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participants = details.participants || [];
        const participantsMarkup = participants.length
          ? `<ul class="participant-list">${participants
              .map(
                (p) =>
                  `<li class="participant-item"><span>${p}</span><button type="button" class="remove-participant" data-activity="${name}" data-email="${p}" aria-label="Remove ${p}">&times;</button></li>`
              )
              .join("")}</ul>`
          : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            ${participantsMarkup}
          </div>
        `;

        activityCard.querySelectorAll(".remove-participant").forEach((button) => {
          button.addEventListener("click", async () => {
            const participantEmail = button.dataset.email;
            const activityName = button.dataset.activity;

            const confirmation = await askRemoveConfirmation(activityName, participantEmail);
            if (!confirmation) {
              messageDiv.textContent = "Participant removal cancelled.";
              messageDiv.className = "info";
              messageDiv.classList.remove("hidden");
              setTimeout(() => {
                messageDiv.classList.add("hidden");
              }, 3000);
              return;
            }

            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(activityName)}/participants/${encodeURIComponent(participantEmail)}`,
                { method: "DELETE" }
              );

              const result = await response.json();

              if (response.ok) {
                messageDiv.textContent = result.message;
                messageDiv.className = "success";
                fetchActivities();
              } else {
                messageDiv.textContent = result.detail || "Failed to remove participant.";
                messageDiv.className = "error";
              }
            } catch (error) {
              messageDiv.textContent = "Failed to remove participant. Please try again.";
              messageDiv.className = "error";
              console.error("Error removing participant:", error);
            }

            messageDiv.classList.remove("hidden");
            setTimeout(() => {
              messageDiv.classList.add("hidden");
            }, 5000);
          });
        });

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
