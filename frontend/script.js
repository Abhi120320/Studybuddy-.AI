const API_URL = 'http://localhost:5000';
let conversationHistory = [];

function showLoading(elementId) {
  document.getElementById(elementId).style.display = 'block';
}

function hideLoading(elementId) {
  document.getElementById(elementId).style.display = 'none';
}

function displayOutput(elementId, content) {
  const output = document.getElementById(elementId);
  output.innerHTML = content;
  output.classList.add('show');
}

function showError(elementId, message) {
  document.getElementById(elementId).innerHTML = `<div class="error">❌ Error: ${message}</div>`;
  document.getElementById(elementId).classList.add('show');
}

function switchTab(tabName) {
  document.getElementById('questionsTab').style.display = 'none';
  document.getElementById('examTab').style.display = 'none';
  document.getElementById('chatTab').style.display = 'none';

  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabName + 'Tab').style.display = 'block';
  event.target.classList.add('active');
}

async function uploadPDF() {
  const fileInput = document.getElementById('pdfFile');
  if (!fileInput.files[0]) {
    alert('Please select a PDF file');
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  showLoading('uploadLoading');

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('uploadStatus').innerHTML = `
        <div class="success">
          ✅ Notes uploaded! (${data.characterCount} characters)
        </div>
      `;
      document.getElementById('uploadStatus').style.display = 'block';
    } else {
      showError('uploadStatus', data.error);
    }
  } catch (error) {
    showError('uploadStatus', error.message);
  }

  hideLoading('uploadLoading');
}

async function generateQuestions() {
  const difficulty = document.getElementById('difficulty').value;
  const count = parseInt(document.getElementById('questionCount').value);

  showLoading('questionLoading');

  try {
    const response = await fetch(`${API_URL}/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ difficulty, count }),
    });

    const data = await response.json();

    if (data.success && data.questions.length > 0) {
      let html = '<h3>📚 Practice Questions</h3>';
      data.questions.forEach((q, idx) => {
        html += `
          <div class="question-card">
            <strong>Q${idx + 1}: ${q.question}</strong>
            <div class="options">
              ${q.options.map((opt, i) => `
                <div class="option">
                  <input type="radio" name="q${idx}" value="${opt}" id="q${idx}opt${i}">
                  <label for="q${idx}opt${i}">${opt}</label>
                </div>
              `).join('')}
            </div>
            <div class="explanation">
              <strong>✓ Correct Answer:</strong> ${q.correctAnswer}<br>
              ${q.explanation}
            </div>
          </div>
        `;
      });
      displayOutput('questionsOutput', html);
    } else {
      showError('questionsOutput', 'Failed to generate questions');
    }
  } catch (error) {
    showError('questionsOutput', error.message);
  }

  hideLoading('questionLoading');
}

async function generateSummary() {
  const topic = document.getElementById('topic').value;
  if (!topic) {
    alert('Please enter a topic');
    return;
  }

  showLoading('toolLoading');

  try {
    const response = await fetch(`${API_URL}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });

    const data = await response.json();

    if (data.success) {
      displayOutput('toolOutput', `
        <h3>📝 Summary: ${topic}</h3>
        <div style="line-height: 1.6; color: #00d4ff;">
          ${data.summary.replace(/\n/g, '<br>')}
        </div>
      `);
    } else {
      showError('toolOutput', data.error);
    }
  } catch (error) {
    showError('toolOutput', error.message);
  }

  hideLoading('toolLoading');
}

async function generateSchedule() {
  const daysUntilExam = parseInt(document.getElementById('daysUntilExam').value);

  showLoading('toolLoading');

  try {
    const response = await fetch(`${API_URL}/study-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daysUntilExam }),
    });

    const data = await response.json();

    if (data.schedule) {
      let html = `<h3>📅 ${daysUntilExam}-Day Study Schedule</h3>`;
      data.schedule.forEach(day => {
        html += `
          <div class="question-card">
            <strong>Day ${day.day}: ${day.topic}</strong><br>
            Duration: ${day.duration}<br>
            <strong>Activities:</strong>
            <ul>
              ${day.activities.map(a => `<li>${a}</li>`).join('')}
            </ul>
          </div>
        `;
      });
      if (data.tips) {
        html += `<h3>💡 Tips</h3>`;
        data.tips.forEach(tip => {
          html += `<div class="success">✓ ${tip}</div>`;
        });
      }
      displayOutput('toolOutput', html);
    } else {
      showError('toolOutput', 'Failed to generate schedule');
    }
  } catch (error) {
    showError('toolOutput', error.message);
  }

  hideLoading('toolLoading');
}

async function generateMockExam() {
  const numQuestions = parseInt(document.getElementById('examQuestions').value);

  showLoading('examLoading');

  try {
    const response = await fetch(`${API_URL}/mock-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numQuestions }),
    });

    const data = await response.json();

    if (data.exam && data.exam.length > 0) {
      let html = `<h3>🏆 Mock Exam (${numQuestions} questions)</h3>`;
      data.exam.forEach((q, idx) => {
        html += `
          <div class="question-card">
            <strong>Q${idx + 1}: ${q.question}</strong>
            <div class="options">
              ${q.options.map((opt, i) => `
                <div class="option">
                  <input type="radio" name="exam${idx}" value="${opt}" id="exam${idx}opt${i}">
                  <label for="exam${idx}opt${i}">${opt}</label>
                </div>
              `).join('')}
            </div>
            <div class="explanation" style="display: none;" id="exp${idx}">
              <strong>✓ Correct Answer:</strong> ${q.correctAnswer}<br>
              ${q.explanation}
            </div>
          </div>
        `;
      });
      html += `<button onclick="submitExam()" style="width: 100%; margin-top: 15px;">📊 Submit & See Results</button>`;
      displayOutput('examOutput', html);
    } else {
      showError('examOutput', 'Failed to generate exam');
    }
  } catch (error) {
    showError('examOutput', error.message);
  }

  hideLoading('examLoading');
}

function submitExam() {
  for (let i = 0; i < 10; i++) {
    const elem = document.getElementById(`exp${i}`);
    if (elem) {
      elem.style.display = 'block';
    }
  }
  alert('✅ Exam submitted! Check your answers above.');
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message) return;

  const messagesDiv = document.getElementById('chatMessages');
  messagesDiv.innerHTML += `
    <div class="chat-message-user">
      <strong>You:</strong> ${message}
    </div>
  `;

  input.value = '';
  showLoading('chatLoading');

  conversationHistory.push({ role: 'user', content: message });

  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: message,
        conversationHistory: conversationHistory,
      }),
    });

    const data = await response.json();

    if (data.success) {
      conversationHistory.push({ role: 'assistant', content: data.answer });
      messagesDiv.innerHTML += `
        <div class="chat-message-ai">
          <strong>Study Buddy:</strong> ${data.answer}
        </div>
      `;
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } else {
      messagesDiv.innerHTML += `
        <div style="color: #ff6b6b;">Error: ${data.error}</div>
      `;
    }
  } catch (error) {
    messagesDiv.innerHTML += `
      <div style="color: #ff6b6b;">Error: ${error.message}</div>
    `;
  }

  hideLoading('chatLoading');
}

function handleChatKeypress(event) {
  if (event.key === 'Enter') {
    sendChatMessage();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Study Buddy AI Frontend loaded');
});
