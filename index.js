import { getRequestHeaders, callPopup, saveSettingsDebounced } from "../../../script.js";
import { initTTSProvider, saveTtsProviderSettings, TTS_PROVIDER_NAME } from "./index.js";

const FISH_VOICES = []; // we'll fetch them later if you want voice list

const defaultSettings = {
    provider: "fish-audio",
    apiKey: "",
    model: "s1",           // or "s1-mini", check their dashboard/docs
    voiceId: "",           // reference voice model id from your Fish Audio account
    // emotion: "",        // optional: (happy), (sad), etc — embedded in text
    format: "mp3",         // mp3, pcm, wav — mp3 is usually fine
    speed: 1.0,
};

let fishSettings = { ...defaultSettings };

function loadSettings() {
    if (extensionSettings[FISH_TTS_KEY]) {
        Object.assign(fishSettings, extensionSettings[FISH_TTS_KEY]);
    }
    $("#fish_api_key").val(fishSettings.apiKey);
    $("#fish_model").val(fishSettings.model);
    $("#fish_voice_id").val(fishSettings.voiceId);
    $("#fish_speed").val(fishSettings.speed);
}

const FISH_TTS_KEY = "fishAudioTTS";

jQuery(async () => {
    const html = `
    <div class="tts-hints">
        <i>Use Fish Audio API — paid service — great cloning & emotion</i><br>
        Get API key: <a href="https://fish.audio" target="_blank">fish.audio</a><br><br>

        <label>API Key: </label><br>
        <input id="fish_api_key" type="password" class="text_pole" placeholder="fsh_..." /><br><br>

        <label>Model: </label>
        <select id="fish_model">
            <option value="s1">S1 (best quality)</option>
            <option value="s1-mini">S1-mini (faster)</option>
        </select><br><br>

        <label>Voice/Model ID: </label><br>
        <input id="fish_voice_id" type="text" class="text_pole" placeholder="voice model id from dashboard (e.g. 849d6d4e...)" /><br>
        <small>Leave empty to use default/fallback voice</small><br><br>

        <label>Speed: </label>
        <input id="fish_speed" type="range" min="0.5" max="2.0" step="0.1" value="1.0" />
        <span id="fish_speed_value">1.0×</span><br><br>

        <div class="tts-hint">Tip: put emotion tags directly in chat: (laughing), (sad), (excited)</div>
    </div>`;

    $("#tts-provider-settings").append(html);

    // Event listeners
    $("#fish_api_key").on("input", () => {
        fishSettings.apiKey = String($("#fish_api_key").val()).trim();
        extensionSettings[FISH_TTS_KEY] = fishSettings;
        saveSettingsDebounced();
    });

    $("#fish_model").on("change", () => {
        fishSettings.model = $("#fish_model").val();
        extensionSettings[FISH_TTS_KEY] = fishSettings;
        saveSettingsDebounced();
    });

    $("#fish_voice_id").on("input", () => {
        fishSettings.voiceId = String($("#fish_voice_id").val()).trim();
        extensionSettings[FISH_TTS_KEY] = fishSettings;
        saveSettingsDebounced();
    });

    $("#fish_speed").on("input", () => {
        fishSettings.speed = Number($("#fish_speed").val());
        $("#fish_speed_value").text(fishSettings.speed.toFixed(1) + "×");
        extensionSettings[FISH_TTS_KEY] = fishSettings;
        saveSettingsDebounced();
    });

    loadSettings();
});

async function onTtsGenerate(text) {
    if (!fishSettings.apiKey) {
        toastr.error("Fish Audio API key is missing", "TTS Error");
        return null;
    }

    const payload = {
        text: text,
        model: fishSettings.model || "s1",
        // You can add more options from docs:
        // references: [...],
        // normalize: true,
        // mp3_bitrate: 128,
        // latency: "normal",
    };

    if (fishSettings.voiceId) {
        payload.reference_id = fishSettings.voiceId;   // most important field for custom voice
    }

    if (fishSettings.speed !== 1) {
        payload.speed = fishSettings.speed;
    }

    try {
        const response = await fetch("https://api.fish.audio/v1/tts", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${fishSettings.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(err);
            toastr.error(`Fish Audio error: ${response.status} ${err.slice(0,120)}`, "TTS Failed");
            return null;
        }

        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        return { audio: new Audio(url), url };
    }
    catch (e) {
        console.error(e);
        toastr.error("Fish Audio request failed", "TTS Error");
        return null;
    }
}

// Register the provider
initTTSProvider({
    name: "Fish Audio",
    generate: onTtsGenerate,
    settingsHtml: "#tts-provider-settings .tts-hints", // optional
});

console.log("[Fish Audio TTS] extension loaded");