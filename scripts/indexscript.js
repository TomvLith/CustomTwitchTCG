let masterCards = {};
let collectionsData = [];

function createCardElement(cardData) {
    const formattedId = cardData.id.replace('card_', '#'); // makes sure so it shows up as an # 001 rather than card_001
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'card-template-wrapper';

    const rarityMap = { // gives the rarities their default backgroundcard
        "common": "images/cCard.png",
        "uncommon": "images/uCard.png",
        "rare": "images/rCard.png",
        "legendary": "images/lCard.png",
        "secret": "images/sCard.png"
    };

    const rarityKey = (cardData.rarity || "common").toLowerCase();

    if (rarityKey.startsWith("custom")) { // handles the full art cards differently than the normal rarity ones
        cardWrapper.style.backgroundImage = `url('${cardData.image}')`;
        cardWrapper.style.backgroundSize = "100% 100%";
        cardWrapper.style.backgroundPosition = "center";
        cardWrapper.style.backgroundRepeat = "no-repeat";
        
        cardWrapper.innerHTML = '';
        
        return cardWrapper;
    }

    const templateBg = rarityMap[rarityKey] || rarityMap["common"];
    cardWrapper.style.backgroundImage = `url('${templateBg}')`;
    // actually fills the html with what cards a person owns
    cardWrapper.innerHTML = `
        <div class="card-dynamic-title">${cardData.name}</div>
        <div class="card-dynamic-image-container">
        <img class="card-dynamic-image" src="${cardData.image}" alt="${cardData.name}" />
        </div>
        <div class="card-dynamic-desc">${cardData.description}</div>
        <div class="card-dynamic-id">${formattedId}</div>
        `;

  return cardWrapper;
}

async function init() { // makes sure it downloads both .JSON files so the app loads faster
    try {
        const [cardsResp, collectionsResp] = await Promise.all([
        fetch('cards.json'),
        fetch('collections.json')
        ]);

        if (!cardsResp.ok || !collectionsResp.ok) {
            throw new Error('HTTP error loading JSON files');
        }

        const rawCards = await cardsResp.json(); 
        collectionsData = await collectionsResp.json();

        rawCards.forEach(c => { 
            masterCards[c.id] = c;
        });

        renderLeaderboard();

        // when a user starts typing in the search bar start listening
        const userInput = document.getElementById('user-input');
        userInput.addEventListener('input', (e) => {
        renderUserCollection(e.target.value);
        });

    }
    // purely for myself. only shows up if I open the file locally
    catch (err) { 
        console.error("Error loading TCG data:", err);
        document.getElementById('stats').innerHTML = 
        `<span style="color: #ff5555;">Remember, you can't open this locally. Push and test through Github pages...</span>`;
    }
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboard-box');
    const chipsArea = document.getElementById('leaderboard-chips');
    
    if (!collectionsData.length) return;

    const userStats = {};

    // check each user and the cards they own
    collectionsData.forEach(entry => {
        if (!entry.username || !Array.isArray(entry.cardIds)) return;
      
    const key = entry.username.toLowerCase();
        if (!userStats[key]) {
            userStats[key] = { displayName: entry.username, uniqueCards: new Set() };
        }
      
        entry.cardIds.forEach(id => userStats[key].uniqueCards.add(id));
    });

    // sort by unique cards and display the top 10
    const sortedUsers = Object.values(userStats)
      .sort((a, b) => b.uniqueCards.size - a.uniqueCards.size)
      .slice(0, 10);

    if (sortedUsers.length === 0) return;

    chipsArea.innerHTML = '';

    // each top 10 user gets a button and ranking
    sortedUsers.forEach((u, index) => {
        const rank = index + 1;
        const chip = document.createElement('button');
        chip.className = 'user-chip';

        let rankColor = '#9c27b0';
        if (rank === 1) {
            rankColor = '#ffd700';
        } else if (rank === 2) {
            rankColor = '#c0c0c0';
        } else if (rank === 3) {
            rankColor = '#cd7f32';
        }

        chip.innerHTML = `
        <span style="color: ${rankColor}; font-weight: bold; margin-right: 4px;">#${rank}</span>
        ${u.displayName} 
        <span class="badge">${u.uniqueCards.size}/${Object.keys(masterCards).length}</span>
        `;
        
        chip.onclick = () => {
            const input = document.getElementById('user-input');
            input.value = u.displayName;
            renderUserCollection(u.displayName);
        };

      chipsArea.appendChild(chip);
    });

    container.style.display = 'flex';
}

// how collection will be displayed
function renderUserCollection(username) {
    const grid = document.getElementById('grid');
    const stats = document.getElementById('stats');
    grid.innerHTML = '';

    // if a user searched for a user and then deletes their search
    if (!username.trim()) {
        stats.textContent = "Your username not here? Search for yours instead!";
        return;
    }

    // make search not case sensitive
    const cleanUser = username.trim().toLowerCase();

    const userEntries = collectionsData.filter(entry => 
    entry.username && entry.username.toLowerCase() === cleanUser
    );

    const cardCounts = {};
    let totalCardsOwned = 0;

    // for each unique cardID add a card owned
    userEntries.forEach(entry => {
      if (Array.isArray(entry.cardIds)) {
            entry.cardIds.forEach(id => {
            cardCounts[id] = (cardCounts[id] || 0) + 1;
            totalCardsOwned++;
        });
      }
    });

    const uniqueOwnedCount = Object.keys(cardCounts).length;
    const totalUniqueInGame = Object.keys(masterCards).length;

    // if search shows no results
    if (totalCardsOwned === 0) {
        grid.innerHTML = `<div class="empty-state">No cards found for user "${username}".</div>`;
        stats.textContent = `0 cards collected`;
        return;
    }

    stats.textContent = `${username} owns ${totalCardsOwned} total cards (${uniqueOwnedCount}/${totalUniqueInGame} unique)`;
    
    // sorts by user ID
    const sortedCardIds = Object.keys(cardCounts).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    // checks how many of that card a person owns
    sortedCardIds.forEach(cardId => {
        const cardObj = masterCards[cardId];
        if (!cardObj) return;

        const count = cardCounts[cardId];

        const cardEl = document.createElement('div');
        cardEl.className = 'card-item';
        
        const renderedCard = createCardElement(cardObj);

        cardEl.innerHTML = `
            <div class="card-details">
            <span class="card-count">x${count}</span>
            </div>
        `;
        
        cardEl.insertBefore(renderedCard, cardEl.firstChild);
        grid.appendChild(cardEl);
    });
}
  
init();