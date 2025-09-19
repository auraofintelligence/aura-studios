const voiceCommandButton = document.getElementById('voice-command-btn');
const voiceStatus = document.getElementById('voice-status');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

voiceCommandButton.addEventListener('click', () => {
    if (typeof config === 'undefined' || !config.OPENAI_API_KEY || config.OPENAI_API_KEY === "YOUR_OPENAI_API_KEY") {
        voiceStatus.textContent = "Error: API key not found. Please create config.js and add your key.";
        voiceStatus.style.color = '#f472b6'; // pink-400
        return;
    }

    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        mediaRecorder.onstop = sendAudioToWhisper;
        mediaRecorder.start();
        isRecording = true;
        voiceStatus.textContent = "Listening...";
        voiceStatus.style.color = '#34d399'; // green-400
        voiceCommandButton.classList.add('recording'); // Add a class for styling
    } catch (error) {
        console.error("Error accessing microphone:", error);
        voiceStatus.textContent = "Error: Could not access microphone.";
        voiceStatus.style.color = '#f472b6'; // pink-400
    }
}

function stopRecording() {
    mediaRecorder.stop();
    isRecording = false;
    voiceStatus.textContent = "Processing...";
    voiceStatus.style.color = '#60a5fa'; // blue-400
    voiceCommandButton.classList.remove('recording');
}

async function sendAudioToWhisper() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');

    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.OPENAI_API_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Whisper API error: ${errorData.error.message}`);
        }

        const data = await response.json();
        const transcript = data.text;
        voiceStatus.textContent = `Recognized: "${transcript}"`;
        voiceStatus.style.color = '#e0e1e6'; // default color
        processCommand(transcript);
    } catch (error) {
        console.error("Error sending audio to Whisper:", error);
        voiceStatus.textContent = "Error: Could not process audio.";
        voiceStatus.style.color = '#f472b6'; // pink-400
    }
}

function processCommand(command) {
    const lowerCommand = command.toLowerCase();
    console.log("Processing command:", lowerCommand);

    const findAndClick = (type, name) => {
        const items = Aura.storyData[type];
        if (!items) return false;

        const item = items.find(i => (i.name || i.title).toLowerCase().includes(name));
        if (item) {
            const element = document.querySelector(`[data-id="${item.id}"]`);
            if (element) {
                Aura.handleSelection(element);
                return true;
            }
        }
        return false;
    };

    if (lowerCommand.includes('character')) {
        const name = lowerCommand.split('character')[1].trim();
        if (findAndClick('characters', name)) return;
    }

    if (lowerCommand.includes('setting')) {
        const name = lowerCommand.split('setting')[1].trim();
        if (findAndClick('settings', name)) return;
    }

    if (lowerCommand.includes('story beat') || lowerCommand.includes('beat')) {
        const name = lowerCommand.split(/story beat|beat/)[1].trim();
        if (findAndClick('storyBeats', name)) return;
    }

    if (lowerCommand.includes('tone')) {
        const name = lowerCommand.split('tone')[1].trim();
        if (findAndClick('tones', name)) return;
    }

    if (lowerCommand.includes('generate script')) {
        Aura.generateScript();
        return;
    }

    if (lowerCommand.includes('generate prompt')) {
        Aura.showPromptModal();
        return;
    }

    if (lowerCommand.includes('clear selection') || lowerCommand.includes('clear selections')) {
        Aura.clearSelections();
        return;
    }

    voiceStatus.textContent = `Unknown command: "${command}"`;
    voiceStatus.style.color = '#fbbf24'; // amber-400
}
