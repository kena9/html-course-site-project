"use strict";

/* ---------- Settings ---------- */
const TIME_LIMIT = 10 * 60;  // seconds allowed (10 minutes)
const PASS_MARK = 7;         // correct answers to pass (7 of 10 = 70%)
const WARNING_TIME = 60;     // the timer bar turns red under this many seconds

/* ---------- Page elements ---------- */
const startPanel = document.getElementById("quiz-start");
const startButton = document.getElementById("start-button");
const quizBar = document.getElementById("quiz-bar");
const timerText = document.getElementById("timer");
const progressLabel = document.getElementById("progress-label");
const progressFill = document.getElementById("progress-fill");
const form = document.getElementById("quiz-form");
const actionNote = document.getElementById("action-note");
const quizActions = document.getElementById("quiz-actions");
const resultActions = document.getElementById("result-actions");
const results = document.getElementById("results");
const chips = document.getElementById("result-chips");
const questions = document.querySelectorAll(".question");
const total = questions.length;

/* ---------- Quiz state ---------- */
let startTime = 0;      // when the Start button was pressed
let timerId = null;     // the id of the running one second timer
let quizRunning = false;

/* ---------- Small helpers ---------- */

// Turns a number of seconds into text like "08:05".
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
}

// Returns what the reader entered for one question:
// the typed text for a fill-in question, or the checked letters (like "BC") for choices.
function getAnswer(question) {
  if (question.dataset.type === "fib") {
    return question.querySelector("input[type=text]").value.trim();
  }
  let letters = "";
  question.querySelectorAll("input:checked").forEach(function (input) {
    letters += input.value;
  });
  return letters;
}

// Checks one answer. Fill-in answers ignore capital letters.
// Select-all answers must match exactly: every right box and no wrong ones.
function isCorrect(question, given) {
  const answer = question.dataset.answer;
  if (question.dataset.type === "fib") {
    return given.toLowerCase() === answer.toLowerCase();
  }
  return given === answer;
}

// Returns the correct answer as readable text for the feedback box.
function getCorrectText(question) {
  const answer = question.dataset.answer;
  if (question.dataset.type === "fib") {
    return answer;
  }
  const parts = [];
  question.querySelectorAll(".choice").forEach(function (label) {
    if (answer.includes(label.querySelector("input").value)) {
      parts.push(label.querySelector(".choice-text").textContent);
    }
  });
  return parts.join("; ");
}

/* ---------- Timer and progress ---------- */

// Counts the questions that have an answer and updates the bar and the note.
function updateProgress() {
  let answered = 0;
  questions.forEach(function (question) {
    if (getAnswer(question) !== "") {
      answered++;
    }
  });
  progressLabel.textContent = answered + " of " + total + " answered";
  progressFill.style.width = (answered / total) * 100 + "%";
  actionNote.textContent = answered + " of " + total +
    " answered. Unanswered questions count as incorrect.";
}

// Runs every second. It works out the time left from the clock, so it stays accurate.
function tick() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remaining = Math.max(TIME_LIMIT - elapsed, 0);
  timerText.textContent = formatTime(remaining);
  quizBar.classList.toggle("is-low", remaining <= WARNING_TIME);
  if (remaining === 0) {
    finishQuiz(true);  // time is up, so submit automatically
  }
}

/* ---------- Starting the quiz ---------- */
function startQuiz() {
  startPanel.hidden = true;
  quizBar.hidden = false;
  form.hidden = false;
  quizRunning = true;
  startTime = Date.now();
  timerText.textContent = formatTime(TIME_LIMIT);
  timerId = setInterval(tick, 1000);
  updateProgress();
  document.getElementById("q1").focus();
}

/* ---------- Submitting and grading ---------- */

// Colors one question card and locks its inputs.
function markQuestion(question, correct) {
  question.classList.add(correct ? "is-correct" : "is-incorrect");

  // Add a status label to the top of the card.
  const status = document.createElement("span");
  status.className = "q-status";
  status.textContent = correct ? "✓ Correct" : "✗ Incorrect";
  question.querySelector(".q-head").appendChild(status);

  // Lock every input so the answers cannot be changed after submitting.
  question.querySelectorAll("input").forEach(function (input) {
    input.disabled = true;
  });

  // Fill-in question: color the text box.
  const textBox = question.querySelector("input[type=text]");
  if (textBox) {
    textBox.classList.add(correct ? "is-right" : "is-wrong");
  }

  // Choice questions: show which row was right, wrong, or missed.
  const answer = question.dataset.answer;
  question.querySelectorAll(".choice").forEach(function (label) {
    const input = label.querySelector("input");
    const isAnswer = answer.includes(input.value);
    label.classList.add("is-locked");
    if (input.checked && isAnswer) {
      tagChoice(label, "is-right", "✓ Correct answer");
    } else if (input.checked) {
      tagChoice(label, "is-wrong", "✗ Your answer");
    } else if (isAnswer && question.dataset.type === "multi") {
      tagChoice(label, "is-missed", "Correct answer (missed)");
    } else if (isAnswer) {
      tagChoice(label, "is-right", "✓ Correct answer");
    }
  });
}

// Adds a color class and a text label to one answer row.
// The text means color is not the only way to tell right from wrong.
function tagChoice(label, className, text) {
  label.classList.add(className);
  const tag = document.createElement("span");
  tag.className = "choice-tag";
  tag.textContent = text;
  label.appendChild(tag);
}

// Adds one line like "Correct answer: href" to a feedback box.
function addLine(box, label, value) {
  const line = document.createElement("p");
  line.appendChild(document.createTextNode(label));
  if (value) {
    const strong = document.createElement("strong");
    strong.textContent = value;
    line.appendChild(strong);
  }
  box.appendChild(line);
}

// Fills in the feedback box under a question.
function showFeedback(question, correct, given) {
  const box = question.querySelector(".feedback");
  const type = question.dataset.type;

  if (correct) {
    // Choice questions already show a "Correct answer" label, so only fill-in needs a line.
    if (type === "fib") {
      addLine(box, "✓ Correct answer: ", question.dataset.answer);
      box.hidden = false;
    }
    return;
  }

  let yours = "no answer";
  if (given !== "") {
    yours = type === "fib" ? given : given.split("").join(", ");
  }
  addLine(box, "✗ Not quite. You answered: ", yours);
  addLine(box, "Correct answer: ", getCorrectText(question));

  // A link back to the page that explains the answer.
  const link = document.createElement("a");
  link.href = question.dataset.review;
  link.textContent = "Review: " + question.dataset.reviewLabel + " →";
  const linkLine = document.createElement("p");
  linkLine.appendChild(link);
  box.appendChild(linkLine);
  box.hidden = false;
}

// Adds one "Q3 ✗" button to the "Jump to a question" list.
function addChip(index, correct) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = "#q" + (index + 1) + "-card";
  link.textContent = "Q" + (index + 1) + " " + (correct ? "✓" : "✗");
  if (!correct) {
    link.className = "is-wrong";
  }
  item.appendChild(link);
  chips.appendChild(item);
}

// Fills in the results panel and shows it.
function showResults(score, elapsed, timeRanOut) {
  const passed = score >= PASS_MARK;

  document.getElementById("result-badge").textContent = passed ? "✓ PASS" : "✗ DID NOT PASS";
  document.getElementById("result-badge").classList.toggle("is-fail", !passed);
  results.classList.toggle("is-fail", !passed);

  document.getElementById("result-score").textContent = score;
  document.getElementById("result-percent").textContent = Math.round((score / total) * 100) + "%.";

  let message = passed
    ? "You passed. You needed " + PASS_MARK + " correct answers."
    : "You needed " + PASS_MARK + " correct answers to pass. Review the pages and try again.";
  if (timeRanOut) {
    message += " Time ran out, so your answers were submitted automatically.";
  }
  document.getElementById("result-message").textContent = message;

  document.getElementById("result-time").textContent = formatTime(elapsed);
  document.getElementById("result-correct").textContent = score;
  document.getElementById("result-incorrect").textContent = total - score;

  results.hidden = false;
  quizBar.hidden = true;
  quizActions.hidden = true;
  resultActions.hidden = false;

  // Bring the score into view and move keyboard focus to it.
  results.scrollIntoView();
  results.focus({ preventScroll: true });
}

// Stops the timer, grades every question, and shows the results.
function finishQuiz(timeRanOut) {
  if (!quizRunning) {
    return;  // already submitted
  }
  quizRunning = false;
  clearInterval(timerId);

  // If time ran out, record the full 10 minutes.
  let elapsed = TIME_LIMIT;
  if (!timeRanOut) {
    elapsed = Math.min(Math.floor((Date.now() - startTime) / 1000), TIME_LIMIT);
  }

  let score = 0;
  questions.forEach(function (question, index) {
    const given = getAnswer(question);
    const correct = isCorrect(question, given);
    if (correct) {
      score++;
    }
    markQuestion(question, correct);
    showFeedback(question, correct, given);
    addChip(index, correct);
  });

  showResults(score, elapsed, timeRanOut);
}

/* ---------- Retaking the quiz ---------- */

// Clears every answer, mark, message, and result, then returns to the start screen.
function retakeQuiz() {
  clearInterval(timerId);
  quizRunning = false;
  form.reset();  // empties the text boxes and unchecks every box

  questions.forEach(function (question) {
    question.classList.remove("is-correct", "is-incorrect");

    const status = question.querySelector(".q-status");
    if (status) {
      status.remove();
    }
    question.querySelectorAll("input").forEach(function (input) {
      input.disabled = false;
      input.classList.remove("is-right", "is-wrong");
    });
    question.querySelectorAll(".choice").forEach(function (label) {
      label.classList.remove("is-locked", "is-right", "is-wrong", "is-missed");
    });
    question.querySelectorAll(".choice-tag").forEach(function (tag) {
      tag.remove();
    });

    const box = question.querySelector(".feedback");
    box.textContent = "";
    box.hidden = true;
  });

  chips.textContent = "";
  results.hidden = true;
  results.classList.remove("is-fail");
  resultActions.hidden = true;
  quizActions.hidden = false;
  form.hidden = true;
  quizBar.hidden = true;
  quizBar.classList.remove("is-low");
  startPanel.hidden = false;
  window.scrollTo(0, 0);
}

/* ---------- Connect the buttons ---------- */
startButton.addEventListener("click", startQuiz);

// Pressing Submit grades the quiz.
form.addEventListener("submit", function (event) {
  event.preventDefault();
  finishQuiz(false);
});

// "Reset answers" clears the answers but keeps the timer running.
// The form resets after this event, so update the progress bar on the next turn.
form.addEventListener("reset", function () {
  setTimeout(updateProgress, 0);
});

// Keep the progress bar current as the reader answers.
form.addEventListener("input", updateProgress);

// Pressing Enter in a text box should not submit the quiz by accident.
form.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && event.target.type === "text") {
    event.preventDefault();
  }
});

document.getElementById("retake-top").addEventListener("click", retakeQuiz);
document.getElementById("retake-bottom").addEventListener("click", retakeQuiz);
