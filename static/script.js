document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const recordButton = document.getElementById("record-button")
    const statusBadge = document.getElementById("status-badge")
    const statusText = document.getElementById("status-text")
    const progressContainer = document.getElementById("progress-container")
    const progressBar = document.getElementById("progress-bar")
    const recordingTime = document.getElementById("recording-time")
    const recordingLimit = document.getElementById("recording-limit")
    const transcriptTab = document.getElementById("transcript-tab")
    const summaryTab = document.getElementById("summary-tab")
    const transcriptContent = document.getElementById("transcript-content")
    const summaryContent = document.getElementById("summary-content")
    const transcriptBox = document.getElementById("transcript-box")
    const summaryPoints = document.getElementById("summary-points")
    const actionItems = document.getElementById("action-items")
    const copyButton = document.getElementById("copy-button")
    const downloadButton = document.getElementById("download-button")
    const addActionButton = document.getElementById("add-action-button")
  
    // State
    let isRecording = false
    let mediaRecorder = null
    let recognition = null
    let timer = null
    let currentTime = 0
    let transcript = ""
    let summary = ""
    const maxRecordingTime = 60 // 60 seconds max recording
  
    // Initial action items
    const defaultActionItems = [
      { id: 1, text: "Follow up on key decisions", checked: false },
      { id: 2, text: "Address any pending issues", checked: false },
    ]
  
    // Initialize action items
    renderActionItems(defaultActionItems)
  
    // Event Listeners
    recordButton.addEventListener("click", toggleRecording)
    transcriptTab.addEventListener("click", () => switchTab("transcript"))
    summaryTab.addEventListener("click", () => switchTab("summary"))
    copyButton.addEventListener("click", copyToClipboard)
    downloadButton.addEventListener("click", downloadSummary)
    addActionButton.addEventListener("click", addActionItem)
  
    // Functions
    function toggleRecording() {
      if (isRecording) {
        stopRecording()
      } else {
        startRecording()
      }
    }
  
    async function startRecording() {
      try {
        updateStatus("Requesting microphone access...", "normal")
  
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  
        // Set up media recorder
        mediaRecorder = new MediaRecorder(stream)
  
        // Set up speech recognition
        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
          recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
  
          recognition.onresult = (event) => {
            let interimTranscript = ""
            let finalTranscript = ""
  
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript
              } else {
                interimTranscript += event.results[i][0].transcript
              }
            }
  
            transcript = finalTranscript || interimTranscript
            updateTranscriptDisplay(transcript)
          }
  
          recognition.start()
        } else {
          updateStatus("Speech recognition not supported in this browser", "normal")
          return
        }
  
        // Start recording
        isRecording = true
        updateRecordButton(true)
        updateStatus("Recording...", "recording")
        currentTime = 0
  
        // Show and update progress bar
        progressContainer.classList.remove("hidden")
  
        // Set up timer
        timer = setInterval(() => {
          currentTime++
          updateProgressBar(currentTime)
  
          if (currentTime >= maxRecordingTime) {
            stopRecording()
          }
        }, 1000)
      } catch (error) {
        console.error("Error starting recording:", error)
        updateStatus(`Error: ${error.message}`, "normal")
      }
    }
  
    function stopRecording() {
      if (recognition) {
        recognition.stop()
      }
  
      if (mediaRecorder) {
        mediaRecorder.stop()
  
        // Stop all tracks in the stream
        mediaRecorder.stream.getTracks().forEach((track) => track.stop())
      }
  
      // Clear timer
      if (timer) {
        clearInterval(timer)
      }
  
      isRecording = false
      updateRecordButton(false)
      updateStatus("Processing...", "normal")
      progressContainer.classList.add("hidden")
  
      // Process the transcript to generate summary
      setTimeout(() => {
        summary = summarizeText(transcript)
        updateSummaryDisplay(summary)
        updateStatus("Ready", "normal")
  
        // Enable copy and download buttons
        copyButton.disabled = false
        downloadButton.disabled = false
      }, 1000)
    }
  
    function updateRecordButton(recording) {
      if (recording) {
        recordButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Stop Recording
        `
        recordButton.classList.remove("primary")
        recordButton.classList.add("destructive")
      } else {
        recordButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" x2="12" y1="19" y2="22"></line>
          </svg>
          Start Recording
        `
        recordButton.classList.remove("destructive")
        recordButton.classList.add("primary")
      }
    }
  
    function updateStatus(message, type) {
      statusText.textContent = message
  
      if (type === "recording") {
        statusBadge.textContent = "Recording"
        statusBadge.classList.add("recording")
      } else {
        statusBadge.textContent = "Ready"
        statusBadge.classList.remove("recording")
      }
    }
  
    function updateProgressBar(time) {
      const percentage = (time / maxRecordingTime) * 100
      progressBar.style.width = `${percentage}%`
      recordingTime.textContent = `Recording: ${time}s`
      recordingLimit.textContent = `${time}/${maxRecordingTime}s`
    }
  
    function updateTranscriptDisplay(text) {
      if (text) {
        transcriptBox.innerHTML = `<p>${text}</p>`
      } else {
        transcriptBox.innerHTML = `<p class="placeholder-text">Transcript will appear here after recording</p>`
      }
    }
  
    function updateSummaryDisplay(text) {
      if (text) {
        const points = formatMeetingPoints(text)
        if (points.length > 0) {
          let pointsHtml = ""
          points.forEach((point) => {
            pointsHtml += `
              <div class="point-item">
                <span class="point-bullet">•</span>
                <span>${point}</span>
              </div>
            `
          })
          summaryPoints.innerHTML = pointsHtml
        } else {
          summaryPoints.innerHTML = `<p>No significant points detected in the recording.</p>`
        }
      } else {
        summaryPoints.innerHTML = `<p class="placeholder-text">Summary will appear here after recording</p>`
      }
    }
  
    function switchTab(tab) {
      if (tab === "transcript") {
        transcriptTab.classList.add("active")
        summaryTab.classList.remove("active")
        transcriptContent.classList.add("active")
        summaryContent.classList.remove("active")
      } else {
        transcriptTab.classList.remove("active")
        summaryTab.classList.add("active")
        transcriptContent.classList.remove("active")
        summaryContent.classList.add("active")
      }
    }
  
    function summarizeText(text) {
      if (!text || text.length < 10) return "Not enough text to summarize."
  
      // Simple implementation of the summarization algorithm
      const sentenceRegex = /[^.!?]+[.!?]+/g
      const sentences = text.match(sentenceRegex) || []
      if (sentences.length <= 2) return text
  
      // Tokenize and count word frequencies
      const wordRegex = /\b\w+\b/g
      const words = text.toLowerCase().match(wordRegex) || []
      const stopWords = new Set([
        "i",
        "me",
        "my",
        "myself",
        "we",
        "our",
        "ours",
        "ourselves",
        "you",
        "your",
        "yours",
        "yourself",
        "yourselves",
        "he",
        "him",
        "his",
        "himself",
        "she",
        "her",
        "hers",
        "herself",
        "it",
        "its",
        "itself",
        "they",
        "them",
        "their",
        "theirs",
        "themselves",
        "what",
        "which",
        "who",
        "whom",
        "this",
        "that",
        "these",
        "those",
        "am",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "having",
        "do",
        "does",
        "did",
        "doing",
        "a",
        "an",
        "the",
        "and",
        "but",
        "if",
        "or",
        "because",
        "as",
        "until",
        "while",
        "of",
        "at",
        "by",
        "for",
        "with",
        "about",
        "against",
        "between",
        "into",
        "through",
        "during",
        "before",
        "after",
        "above",
        "below",
        "to",
        "from",
        "up",
        "down",
        "in",
        "out",
        "on",
        "off",
        "over",
        "under",
        "again",
        "further",
        "then",
        "once",
        "here",
        "there",
        "when",
        "where",
        "why",
        "how",
        "all",
        "any",
        "both",
        "each",
        "few",
        "more",
        "most",
        "other",
        "some",
        "such",
        "no",
        "nor",
        "not",
        "only",
        "own",
        "same",
        "so",
        "than",
        "too",
        "very",
        "s",
        "t",
        "can",
        "will",
        "just",
        "don",
        "should",
        "now",
      ])
  
      const wordFrequencies = {}
      words.forEach((word) => {
        if (!stopWords.has(word)) {
          wordFrequencies[word] = (wordFrequencies[word] || 0) + 1
        }
      })
  
      // Score sentences
      const sentenceScores = {}
      sentences.forEach((sentence) => {
        const sentenceWords = sentence.toLowerCase().match(wordRegex) || []
        const sentenceLength = sentenceWords.length
  
        if (sentenceLength > 0) {
          let score = 0
          sentenceWords.forEach((word) => {
            if (wordFrequencies[word]) {
              score += wordFrequencies[word]
            }
          })
          sentenceScores[sentence] = score / sentenceLength
        }
      })
  
      // Select top sentences
      const summaryRatio = 0.35
      const numSentences = Math.max(1, Math.floor(sentences.length * summaryRatio))
  
      const rankedSentences = Object.keys(sentenceScores)
        .sort((a, b) => sentenceScores[b] - sentenceScores[a])
        .slice(0, numSentences)
  
      return rankedSentences.join(" ")
    }
  
    function formatMeetingPoints(text) {
      if (!text) return []
  
      // Split by sentence endings and filter out unwanted content
      const points = text.split(/[.!?]+/).filter((point) => {
        const trimmedPoint = point.trim()
        return (
          trimmedPoint &&
          !["kids", "women", "man", "not related"].some((word) => trimmedPoint.toLowerCase().includes(word))
        )
      })
  
      return points.map((point) => point.trim()).filter(Boolean)
    }
  
    function renderActionItems(items) {
      actionItems.innerHTML = ""
      items.forEach((item) => {
        const li = document.createElement("li")
        li.className = "action-item"
        li.innerHTML = `
          <input type="checkbox" id="item-${item.id}" class="checkbox" ${item.checked ? "checked" : ""}>
          <label for="item-${item.id}" class="action-label ${item.checked ? "checked" : ""}">${item.text}</label>
        `
  
        // Add event listener to checkbox
        actionItems.appendChild(li)
        document.getElementById(`item-${item.id}`).addEventListener("change", (e) => {
          toggleActionItem(item.id, e.target.checked)
        })
      })
    }
  
    function toggleActionItem(id, checked) {
      const items = Array.from(actionItems.querySelectorAll(".action-item")).map((item) => {
        const checkbox = item.querySelector(".checkbox")
        const label = item.querySelector(".action-label")
        const itemId = Number.parseInt(checkbox.id.replace("item-", ""))
  
        if (itemId === id) {
          label.classList.toggle("checked", checked)
          return { id: itemId, text: label.textContent, checked: checked }
        }
  
        return { id: itemId, text: label.textContent, checked: checkbox.checked }
      })
  
      // Update the action items (in a real app, you might save this to storage)
      renderActionItems(items)
    }
  
    function addActionItem() {
      const items = Array.from(actionItems.querySelectorAll(".action-item")).map((item) => {
        const checkbox = item.querySelector(".checkbox")
        const label = item.querySelector(".action-label")
        const itemId = Number.parseInt(checkbox.id.replace("item-", ""))
  
        return { id: itemId, text: label.textContent, checked: checkbox.checked }
      })
  
      const newId = items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1
      items.push({ id: newId, text: "New action item", checked: false })
  
      renderActionItems(items)
    }
  
    function copyToClipboard() {
      const meetingPoints = formatMeetingPoints(summary)
      const actionItemsText = Array.from(actionItems.querySelectorAll(".action-item"))
        .map((item) => {
          const checkbox = item.querySelector(".checkbox")
          const label = item.querySelector(".action-label")
          return `- [${checkbox.checked ? "x" : " "}] ${label.textContent}`
        })
        .join("\n")
  
      const textToCopy = `
  Meeting Summary
  ------------------------
  Main Discussion Points:
  ${meetingPoints.map((point) => `- ${point}`).join("\n")}
  
  Action Items:
  ${actionItemsText}
      `
  
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          updateStatus("Copied to clipboard!", "normal")
          setTimeout(() => updateStatus("Ready", "normal"), 2000)
        })
        .catch((err) => {
          console.error("Could not copy text: ", err)
          updateStatus("Failed to copy to clipboard", "normal")
        })
    }
  
    function downloadSummary() {
      const meetingPoints = formatMeetingPoints(summary)
      const actionItemsText = Array.from(actionItems.querySelectorAll(".action-item"))
        .map((item) => {
          const checkbox = item.querySelector(".checkbox")
          const label = item.querySelector(".action-label")
          return `- [${checkbox.checked ? "x" : " "}] ${label.textContent}`
        })
        .join("\n")
  
      const textToDownload = `
  Meeting Summary
  ------------------------
  Main Discussion Points:
  ${meetingPoints.map((point) => `- ${point}`).join("\n")}
  
  Action Items:
  ${actionItemsText}
      `
  
      const blob = new Blob([textToDownload], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `meeting-minutes-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  })
  
  