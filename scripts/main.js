/**
 * ARENA TEAMS - Frontend Logic
 */

const socket = io('https://game.axom.app/teams', { 
    transports: ['websocket', 'polling'],
    upgrade: true,
    reconnectionAttempts: 5
});

let currentSession = null;
let isAdmin = false;
let myName = "";

// Elementos UI
const badge = document.getElementById('motor-status-badge');
const screenWelcome = document.getElementById('screen-welcome');
const screenAdmin = document.getElementById('screen-admin');
const screenJoin = document.getElementById('screen-join');
const screenWaiting = document.getElementById('screen-waiting');
const screenResult = document.getElementById('screen-result');

// --- CONECTIVIDADE ---
socket.on('connect', () => {
    badge.innerText = 'Motor: Online';
    badge.className = 'status-badge connected';
    console.log('✅ Conectado ao Motor Arena');
});

socket.on('disconnect', () => {
    badge.innerText = 'Motor: Offline';
    badge.className = 'status-badge disconnected';
    console.log('❌ Desconectado do Motor Arena');
});

socket.on('connect_error', (error) => {
    badge.innerText = 'Motor: Erro';
    badge.className = 'status-badge disconnected';
    console.log('⚠️ Erro de conexão:', error.message);
});

// --- ADMIN: Criar Sessão ---
function showCreateSession() {
    socket.emit('createSession');
}

socket.on('sessionCreated', ({ sessionCode }) => {
    currentSession = sessionCode;
    isAdmin = true;
    showScreen(screenAdmin);
    document.getElementById('admin-session-code').innerText = sessionCode;
    
    // Gerar QR Code
    const qrContainer = document.getElementById('qrcode-container');
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
        text: `https://teams.axom.app/?s=${sessionCode}`,
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff"
    });
});

// --- ADMIN: Participantes ---
socket.on('participantJoined', ({ name, count }) => {
    const list = document.getElementById('admin-participant-list');
    const item = document.createElement('div');
    item.className = 'participant-item';
    item.innerText = name;
    list.appendChild(item);
    
    const btn = document.getElementById('btn-start-teams');
    btn.disabled = count < 2;
});

// --- ADMIN: Sorteio ---
function drawGroups() {
    const size = document.getElementById('group-size').value;
    const leaders = document.getElementById('enable-leaders').checked;
    
    socket.emit('drawGroups', { 
        sessionCode: currentSession, 
        config: { size, leaders } 
    });
}

// --- PARTICIPANTE: Entrar ---
function showJoinSession() {
    showScreen(screenJoin);
}

function joinSession() {
    const code = document.getElementById('input-session-code').value.toUpperCase().trim();
    const name = document.getElementById('input-participant-name').value.trim();
    
    if (!code || !name) return;
    
    myName = name;
    socket.emit('joinSession', { sessionCode: code, name });
}

socket.on('joined', ({ sessionCode }) => {
    currentSession = sessionCode;
    showScreen(screenWaiting);
});

socket.on('error', (msg) => {
    alert(msg);
});

// --- RESULTADOS ---
socket.on('revealed', ({ groupName, role, members }) => {
    showScreen(screenResult);
    document.getElementById('result-group-name').innerText = groupName;
    
    const roleBadge = document.getElementById('result-role-badge');
    roleBadge.innerText = role === 'leader' ? '👑 LÍDER DA EQUIPE' : 'MEMBRO DA EQUIPE';
    roleBadge.style.background = role === 'leader' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)';
    roleBadge.style.color = role === 'leader' ? 'black' : 'white';
    
    const list = document.getElementById('team-members-list');
    list.innerHTML = "";
    members.forEach(m => {
        const li = document.createElement('li');
        li.innerText = m === myName ? `${m} (Você)` : m;
        if (m === myName) li.style.fontWeight = "bold";
        list.appendChild(li);
    });
});

// --- AUXILIARES ---
function showScreen(screen) {
    [screenWelcome, screenAdmin, screenJoin, screenWaiting, screenResult].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

function resetApp() {
    location.reload();
}

// Autojoin via URL
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('s');
    if (code) {
        document.getElementById('input-session-code').value = code;
        showJoinSession();
    }
};
