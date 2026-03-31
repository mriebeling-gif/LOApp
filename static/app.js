const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const fileList = document.getElementById('fileList');
const results = document.getElementById('results');
const documentCards = document.getElementById('documentCards');
const worksheet = document.getElementById('worksheet');

let selectedFiles = [];

browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => setFiles(Array.from(fileInput.files)));

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files);
  setFiles(files);
});

analyzeBtn.addEventListener('click', analyzeFiles);

function setFiles(files) {
  selectedFiles = files.filter((f) => f.type === 'application/pdf' || f.type.startsWith('image/'));
  fileList.innerHTML = '';
  selectedFiles.forEach((file) => {
    const li = document.createElement('li');
    li.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    fileList.appendChild(li);
  });
  analyzeBtn.disabled = selectedFiles.length === 0;
}

async function analyzeFiles() {
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing...';

  const formData = new FormData();
  selectedFiles.forEach((file) => formData.append('files', file));

  try {
    const response = await fetch('/api/analyze', { method: 'POST', body: formData });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Analysis failed');
    }

    const data = await response.json();
    renderResults(data);
  } catch (error) {
    alert(error.message);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze Income';
  }
}

function renderResults(data) {
  documentCards.innerHTML = '';
  data.documents.forEach((doc) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${doc.filename}</h3>
      <p><strong>Type:</strong> ${doc.identified_document_type} (${doc.confidence})</p>
      <p><strong>Borrowers:</strong> ${(doc.borrowers || []).join(', ') || 'N/A'}</p>
      <p><strong>Notes:</strong> ${(doc.notes || []).join('; ') || 'None'}</p>
      <details>
        <summary>Income Fields</summary>
        <code>${JSON.stringify(doc.key_income_fields, null, 2)}</code>
      </details>
    `;
    documentCards.appendChild(card);
  });

  const ws = data.worksheet;
  worksheet.innerHTML = `
    <p><strong>Summary:</strong> ${ws.underwriting_summary}</p>
    <p><strong>Monthly Qualifying Income:</strong> $${Number(ws.monthly_qualifying_income).toLocaleString()}</p>
    <p><strong>Annual Qualifying Income:</strong> $${Number(ws.annual_qualifying_income).toLocaleString()}</p>
    <h3>Line-by-Line Math</h3>
    <ul>${(ws.line_by_line_math || []).map((line) => `<li>${line}</li>`).join('')}</ul>
    <h3>Assumptions</h3>
    <ul>${(ws.assumptions || []).map((line) => `<li>${line}</li>`).join('')}</ul>
    <h3>BytePro Copy Block</h3>
    <code id="byteproBlock">${ws.bytepro_copy_block}</code>
    <button id="copyBtn" type="button">Copy for BytePro</button>
  `;

  document.getElementById('copyBtn').addEventListener('click', async () => {
    const text = document.getElementById('byteproBlock').innerText;
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  });

  results.classList.remove('hidden');
}
