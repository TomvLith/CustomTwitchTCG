const WS_URL = "ws://127.0.0.1:8080/";
let socket;
let masterCards = {};

const overlayContainer = document.getElementById('overlay-container');
const userBadge = document.getElementById('username');
const cardStage = document.getElementById('card-stage');
const packGif = document.getElementById('pack-gif');

// timing for animations
const CARD_APPEAR_DELAY_MS = 2100;
const GIF_DURATION_MS = 3000; 
const CARD_DISPLAY_MS = 4500; 
const SLIDE_ANIMATION_MS = 600; 

// load the cards from your .JSON file
async function loadMasterCards() {
    try {
        const response = await fetch('cards.json');
        if (!response.ok) throw new Error('Failed to load cards.json');
    
        const data = await response.json();
        data.forEach(c => {
            masterCards[c.id] = c;
        });
    }
    catch (err) {
        // silent catch
    }
}

// replaces variables of card with actual info displayed on the card
function createCardElement(cardData) {
    const formattedId = cardData.id.replace('card_', '#');
    const cardEl = document.createElement('div');
    cardEl.className = 'card';

    // if it cant find a rarity assign common rarity to card
    let rawRarity = cardData.rarity;
    if (!rawRarity && masterCards[cardData.id]) {
        rawRarity = masterCards[cardData.id].rarity;
    }

    const rarityKey = rawRarity ? rawRarity.toLowerCase() : "common";

    // full art logic
    if (rarityKey.startsWith("custom")) {
        cardEl.style.backgroundImage = `url('${cardData.image}')`;
        cardEl.style.backgroundSize = "100% 100%";
        cardEl.style.backgroundPosition = "center";
        cardEl.style.backgroundRepeat = "no-repeat";
    
        cardEl.innerHTML = ''; 
        return cardEl; 
    }

    // background card design for rarities
    const rarityMap = {
        "common": "images/cCard.png",
        "uncommon": "images/uCard.png",
        "rare": "images/rCard.png",
        "legendary": "images/lCard.png",
        "secret": "images/sCard.png"
    };

    const templateBg = rarityMap[rarityKey] || rarityMap["common"];
    cardEl.style.backgroundImage = `url('${templateBg}')`;

    cardEl.innerHTML = `
        <div class="card-dynamic-title">${cardData.name}</div>
        <div class="card-dynamic-image-container">
        <img class="card-dynamic-image" src="${cardData.image}" alt="${cardData.name}" />
        </div>
        <div class="card-dynamic-desc">${cardData.description}</div>
        <div class="card-dynamic-id">${formattedId}</div>
    `;

  return cardEl;
}

// streamer.bot integration
function connectWebSocket() {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        const subscribeMsg = {
            request: "Subscribe",
            id: "tcg-overlay",
            events: {
                General: ["Custom"]
            }
        };
        socket.send(JSON.stringify(subscribeMsg));
    };

    socket.onmessage = (event) => {
        console.log("Raw WS Message Received:", event.data);

        try {
            let raw = JSON.parse(event.data);
            let payload = raw;

            // trigger overlay from streamer.bot
            if (raw.data) {
                payload = raw.data;
            }

            if (typeof payload === 'string') {
                payload = JSON.parse(payload);
            }

            if (payload.data && typeof payload.data === 'string') {
                payload = JSON.parse(payload.data);
            } else if (payload.data) {
                payload = payload.data;
            }

            console.log("Parsed Payload Object:", payload);

            //  make sure the action name is the same
            if (payload && (payload.event_type === "pack_opened" || raw.event?.name === "pack_opened")) {
                const username = payload.user || payload.data?.user || "Viewer";
                const cards = payload.cards || payload.data?.cards || [];
                
                console.log("Triggering Pack Opening for:", username);
                triggerPackOpening(username, cards);
            }
        } 
        catch (err) {
            console.error("Error parsing WS message:", err);
        }
    };

    socket.onclose = () => {
        console.log("WebSocket connection closed. Retrying in 3s...");
        setTimeout(connectWebSocket, 3000);
    };
}

// actual pack opening event trigger
function triggerPackOpening(username, cards) {
    userBadge.textContent = username;
 
    cardStage.style.display = 'none';
    cardStage.innerHTML = ''; 
 
    overlayContainer.classList.add('active');

    packGif.src = `images/PackOpening.webp?t=${Date.now()}`;
    packGif.style.display = 'block';

    setTimeout(() => {
        packGif.style.display = 'none';
    }, GIF_DURATION_MS);

    setTimeout(() => {
        cardStage.style.display = 'block';
        
        const cardElements = [];

        cards.forEach((card, index) => {
            const cardEl = createCardElement(card);
            cardEl.style.transform = `translateY(${index * 4}px) scale(${1 - (index * 0.02)})`;
            cardEl.style.zIndex = cards.length - index;

            cardStage.appendChild(cardEl);
            cardElements.push(cardEl);
        });

        startAutoSlideSequence(cardElements);

    }, CARD_APPEAR_DELAY_MS);
}

function startAutoSlideSequence(cardElements) {
    let currentIndex = 0;

    function showNextCard() {
        if (currentIndex < cardElements.length) {
            setTimeout(() => {
                cardElements[currentIndex].classList.add('slide-out');
                currentIndex++;
                setTimeout(showNextCard, SLIDE_ANIMATION_MS);
            }, CARD_DISPLAY_MS);
        } 
        else {
            setTimeout(() => {
                overlayContainer.classList.remove('active');
                cardStage.style.display = 'none';
            }, 300);
        }
    }

    showNextCard();
}

loadMasterCards().then(() => {
    connectWebSocket();
});