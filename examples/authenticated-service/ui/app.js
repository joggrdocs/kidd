// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const tokenSelect = document.getElementById('token-select')
const apiUrlInput = document.getElementById('api-url')
const btnConnect = document.getElementById('btn-connect')
const btnDisconnect = document.getElementById('btn-disconnect')
const connStatus = document.getElementById('conn-status')
const btnMe = document.getElementById('btn-me')
const btnRepos = document.getElementById('btn-repos')
const btnHealth = document.getElementById('btn-health')
const btnCreateRepo = document.getElementById('btn-create-repo')
const repoNameInput = document.getElementById('repo-name')
const responseArea = document.getElementById('response-area')

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentToken = null
let baseUrl = 'http://localhost:3001'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setConnected(connected) {
  const actionButtons = [btnMe, btnRepos, btnHealth, btnCreateRepo]
  actionButtons.forEach(function (btn) {
    btn.disabled = !connected
  })
  btnConnect.disabled = connected
  btnDisconnect.disabled = !connected

  if (connected) {
    connStatus.textContent = 'Connected'
    connStatus.className = 'connected'
  } else {
    connStatus.textContent = 'Disconnected'
    connStatus.className = 'disconnected'
  }
}

function showResponse(status, data) {
  const isOk = status >= 200 && status < 300
  const statusClass = isOk ? 'status-ok' : 'status-err'
  const json = JSON.stringify(data, null, 2)

  responseArea.innerHTML =
    '<span class="status ' +
    statusClass +
    '">HTTP ' +
    status +
    '</span>' +
    '<div class="response"><pre>' +
    escapeHtml(json) +
    '</pre></div>'
}

function showLoading() {
  responseArea.innerHTML = '<span class="status status-loading">Loading...</span>'
}

function showError(message) {
  responseArea.innerHTML =
    '<span class="status status-err">Error</span>' +
    '<div class="response"><pre>' +
    escapeHtml(message) +
    '</pre></div>'
}

function escapeHtml(text) {
  var div = document.createElement('div')
  div.appendChild(document.createTextNode(text))
  return div.innerHTML
}

async function apiRequest(method, path, body) {
  showLoading()

  var headers = { 'Content-Type': 'application/json' }
  if (currentToken !== null) {
    headers['Authorization'] = 'Bearer ' + currentToken
  }

  var init = { method: method, headers: headers }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }

  try {
    var res = await fetch(baseUrl + path, init)
    var data = await res.json()
    showResponse(res.status, data)
  } catch (err) {
    showError('Network error: ' + err.message + '\n\nMake sure the API server is running:\n  pnpm api')
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

btnConnect.addEventListener('click', function () {
  var token = tokenSelect.value
  if (token === '') {
    showError('Please select a token first')
    return
  }
  currentToken = token
  baseUrl = apiUrlInput.value.replace(/\/+$/, '')
  setConnected(true)
  showResponse(200, { message: 'Connected with token ' + token.slice(0, 12) + '...' })
})

btnDisconnect.addEventListener('click', function () {
  currentToken = null
  setConnected(false)
  responseArea.innerHTML = '<span class="status status-loading">Disconnected</span>'
})

btnMe.addEventListener('click', function () {
  apiRequest('GET', '/user')
})

btnRepos.addEventListener('click', function () {
  apiRequest('GET', '/repos')
})

btnHealth.addEventListener('click', function () {
  apiRequest('GET', '/health')
})

btnCreateRepo.addEventListener('click', function () {
  var name = repoNameInput.value.trim()
  if (name === '') {
    showError('Please enter a repo name')
    return
  }
  apiRequest('POST', '/repos', { name: name, private: false })
})
