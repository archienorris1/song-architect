const startingPoints = [
  {label:'An idea or voice note', match:/voice note|idea|melody|lyrics|hum|writing|scratch/i, service:'Songwriting', advice:'A songwriter can help turn the idea into a complete song. If the melody and lyrics are already finished, a producer can take it from there.'},
  {label:'A written song / demo', match:/demo|written|producer|arrang/i, service:'Production', advice:'A producer can build the arrangement around your song and help you decide what to record next.'},
  {label:'A produced track', match:/mix|mastering|stems|produced|polish/i, service:'Mixing', advice:'A mix engineer can balance the tracks you’ve recorded. Mastering comes after you’re happy with the mix.'},
  {label:'I need session vocals', match:/singer|sing on|session voc|lead vocal/i, service:'Session vocals', advice:'A session singer can record a lead vocal, harmonies or both. Share your track and a reference for the performance.'},
  {label:'A finished master', match:/release|artwork|distribut|finished master|promotion/i, service:null, advice:'Start with release preparation: confirm your credits, artwork and release date, then plan how you’ll share the song.'}
];
let guideMessages = [];
let guideChoice = null;
let guideNote = '';
let pendingTimestamp = null;
const versions = [
  {id:'v1', name:'Version 1', label:'First arrangement', file:'assets/daylight-v1.wav'},
  {id:'v2', name:'Version 2', label:'Updated arrangement', file:'assets/daylight-v2.wav'}
];
let activeVersion = versions[1];

function guidePage() {
  return `<div class="container journey-page"><section class="page-title"><div class="eyebrow orange">Start wherever you are</div><h1>What do I need?</h1><p>Tell us what you have and what you want to make. We’ll suggest a next step in plain English.</p></section>
    <section class="journey-card"><div class="conversation" aria-label="Guide conversation">
    <p class="bubble">Hey! What are you working on? A voice note, a demo, something you’ve recorded, or a song that’s ready to release?</p>
    ${guideMessages.map(message => `<p class="bubble ${message.mine?'mine':''}">${esc(message.text)}</p>`).join('')}
    </div>
    ${guideChoice ? `<div class="guide-result"><span class="eyebrow orange">Suggested next step</span><h3>${guideChoice.service || 'Release preparation'}</h3><p>${guideChoice.advice}</p><div class="journey-actions"><button class="button dark small" data-journey="guide-brief">Use this in my brief</button>${guideChoice.service?`<button class="button outline small" data-journey="guide-matches">Find a music pro</button>`:''}</div></div>` : ''}
    <div class="journey-actions quick-replies" aria-label="Starting points">${startingPoints.map((choice,index)=>`<button class="chip" data-journey="guide-choice" data-index="${index}">${choice.label}</button>`).join('')}</div>
    <form class="journey-form" id="guide-form"><label class="visually-hidden" for="guide-input">Describe your song</label><input id="guide-input" name="message" required maxlength="500" placeholder="I have a voice note and…"><button class="button dark small">Send</button></form>
    <p class="note">This prototype uses example guidance based on your answers. Messages stay in this page.</p></section></div>`;
}

function answerGuide(value, selected) {
  const text = value.trim();
  if (!text) return;
  guideMessages.push({mine:true,text});
  guideNote = text;
  guideChoice = selected || startingPoints.find(choice => choice.match.test(text)) || null;
  guideMessages.push({text:guideChoice?'Here’s where I’d start.':'What do you have so far? Pick the closest starting point below and I’ll suggest who can help.'});
  render();
  $('#guide-input').focus();
}

function songThread() {
  const notes = state.songMessages || [];
  const muted = state.notifications?.muted || false;
  return `<div class="container journey-page"><section class="page-title"><div class="eyebrow orange">Project messages / Daylight</div><h1>One thread for your song.</h1><p>Listen to a version, leave a note at the right moment and keep the conversation with the project.</p></section>
    <div class="song-grid"><section class="journey-card player-card"><span class="eyebrow orange">Listen on any device</span><h3>${activeVersion.name} · ${activeVersion.label}</h3>
    <div class="journey-actions">${versions.map(version=>`<button class="chip" aria-pressed="${version.id===activeVersion.id}" data-journey="version" data-version="${version.id}">${version.name}</button>`).join('')}</div>
    <audio id="song-audio" controls preload="metadata" src="${activeVersion.file}">Your browser cannot play this demo audio.</audio>
    <button class="button outline small" data-journey="timestamp">Add note at current time</button>
    <p class="note">Two short instrumental previews made for this demo.</p></section>
    <section class="journey-card thread-card"><div class="thread-heading"><h3>Daylight messages</h3><button class="chip" data-journey="mute" aria-pressed="${muted}">${muted?'Unmute project':'Mute project'}</button></div>
    <div class="conversation thread-notes" aria-label="Song messages"><div class="bubble"><strong>Maya · Example collaborator</strong><p>Version 2 is up. I’ve added a little more movement to the arrangement. Let me know what you think.</p></div>
    ${notes.map(note => `<div class="bubble mine"><strong>${esc(note.sender)}</strong>${note.version?` <button class="time-link" data-journey="seek" data-version="${esc(note.version)}" data-time="${Number(note.time)}">${note.version==='v1'?'V1':'V2'} · ${formatSongTime(note.time)}</button>`:''}<p>${esc(note.text)}</p></div>`).join('')}</div>
    <p id="timestamp-label" class="note">${pendingTimestamp?'Note attached at '+formatSongTime(pendingTimestamp.time):'Add feedback or send a message.'}</p>
    <form class="journey-form" id="thread-form"><label class="visually-hidden" for="song-message">Project message</label><input id="song-message" name="message" maxlength="1000" required placeholder="Write a message…"><button class="button dark small">Send</button></form><p class="note">Demo messages are saved in this browser.</p></section></div></div>`;
}

function formatSongTime(seconds) {
  const time = Math.floor(seconds);
  return Math.floor(time / 60) + ':' + String(time % 60).padStart(2,'0');
}

function notificationsPage() {
  const prefs = {mode:'Daily digest', from:'09:00', to:'18:00', quiet:true, muted:false, ...state.notifications};
  return `<div class="container journey-page"><section class="page-title"><div class="eyebrow orange">Professional workspace / Notifications</div><h1>Reply on your schedule.</h1><p>Keep your personal number private. Set when project messages can interrupt you and which updates you want to see straight away.</p></section>
  <form id="notifications-form" class="journey-card settings-card"><label for="notification-mode"><strong>Routine project messages</strong></label><select name="mode" id="notification-mode">${['As they arrive','Daily digest','In-app only'].map(mode=>`<option ${prefs.mode===mode?'selected':''}>${mode}</option>`).join('')}</select>
    <label class="setting-check"><input type="checkbox" name="quiet" ${prefs.quiet?'checked':''}> Quiet outside working hours</label>
    <div class="time-fields"><label>Start<input name="from" type="time" required value="${esc(prefs.from)}"></label><label>Finish<input name="to" type="time" required value="${esc(prefs.to)}"></label></div>
    <p class="note">Working hours use your device’s local time.</p>
    <label class="setting-check"><input type="checkbox" name="muted" ${prefs.muted?'checked':''}> Mute Daylight project messages</label>
    <p class="note">Booking requests, approvals and payout updates stay visible in your workspace.</p><button class="button dark small">Save preferences</button><p class="note">Demo preferences are saved here. Delivery channels would be connected in the live product.</p></form></div>`;
}

function storyPage() {
  return `<div class="container journey-page">
    <section class="page-title"><div class="eyebrow orange">Our story / Archie &amp; Jack</div><h1>We started with songs we couldn’t finish.</h1><p>We built Song Architect to give other artists the help we wish we’d had.</p></section>
    <div class="story-grid">
      <article class="journey-card"><h2>Where it started</h2>
        <p>We met studying songwriting at BIMM Brighton. We both dreamed of making records that would top the charts, and we’d talk about songs we were proud of that we couldn’t get past the demo stage. We could hear how they should sound on the radio. We just didn’t know who could help us get them there.</p>
        <p>So we spent years learning to do it ourselves. We started Song Architect by writing, producing, mixing and mastering songs for other artists. We’re songwriters first, and working alongside friends who live for production and engineering showed us how much the right specialist can bring to a record.</p>
      </article>
      <article class="journey-card"><h2>From the artist side</h2>
        <p>Jack had opportunities with Universal, and Archie had opportunities with Sony, Warner and BMG. Archie started writing songs and busking at nine, producing at 12, and went on to sell out shows at venues including the 100 Club.</p>
        <p>Archie grew a social following of over 250,000 by sharing covers, often just as the original songs came out. Those covers opened conversations with artists including Felix Jaehn, Jonas Blue, Sabrina Carpenter, Ruel and Bebe Rexha. His songwriting caught Dave Stewart’s attention, and Sir Paul McCartney sent him a personal letter congratulating him on his writing. Archie’s original songs earned over four million streams across platforms in 2020.</p>
        <p>Along the way, Archie worked with organisations including BMG, MTV, Sony Music Entertainment, Universal Music Publishing Group, the BBC, YouTube, Under Armour and Cosmopolitan.</p>
      </article>
    </div>
    <section class="home-workspace" aria-labelledby="mission-title"><div>
      <div class="eyebrow orange">Our mission</div><h2 id="mission-title">Make exceptional collaborators easier to find.</h2>
      <p>We want artists to have access to the writers, producers, musicians and engineers we’d trust with our own songs. Whether you bring a voice note or a nearly finished record, we want to help you find the person who can take it further.</p>
      <p>There’s nothing like putting a piece of yourself into the world as a song. We want more artists to get to feel that.</p>
    </div><a class="button dark small" href="#guide">Find your next step</a></section>
  </div>`;
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-journey]');
  if (!button) return;
  switch (button.dataset.journey) {
    case 'guide-choice': {
      const choice = startingPoints[Number(button.dataset.index)];
      answerGuide(choice.label, choice);
      break;
    }
    case 'guide-brief':
      startSong();
      $('#brief-form').elements.start.value = guideChoice.label;
      $('#brief-form').elements.brief.value = guideNote;
      break;
    case 'guide-matches':
      audience = 'artist';
      genre = 'All genres';
      role = guideChoice.service;
      search = '';
      go('talent');
      break;
    case 'version':
    case 'seek': {
      activeVersion = versions.find(version => version.id === button.dataset.version);
      const draft = $('#song-message').value;
      render();
      $('#song-message').value = draft;
      const player = $('#song-audio');
      if (button.dataset.journey === 'seek') player.currentTime = Number(button.dataset.time);
      break;
    }
    case 'timestamp':
      pendingTimestamp = {version:activeVersion.id,time:$('#song-audio').currentTime};
      $('#timestamp-label').textContent = 'Note attached at ' + formatSongTime(pendingTimestamp.time);
      $('#song-message').focus();
      break;
    case 'mute':
      state.notifications = {...state.notifications, muted:!state.notifications?.muted};
      persist();
      button.setAttribute('aria-pressed', String(state.notifications.muted));
      button.textContent = state.notifications.muted ? 'Unmute project' : 'Mute project';
      toast(state.notifications.muted ? 'Daylight muted in this demo.' : 'Daylight unmuted.');
      break;
  }
});

document.addEventListener('submit', event => {
  const form = event.target;
  if (!['guide-form','thread-form','notifications-form'].includes(form.id)) return;
  event.preventDefault();
  const fields = new FormData(form);
  if (form.id === 'guide-form') {
    answerGuide(fields.get('message'));
    return;
  }
  if (form.id === 'notifications-form') {
    state.notifications = {mode:fields.get('mode'),from:fields.get('from'),to:fields.get('to'),quiet:fields.has('quiet'),muted:fields.has('muted')};
    persist();
    toast('Notification preferences saved in this browser.');
    return;
  }
  const message = fields.get('message').trim();
  if (!message) return;
  const note = {sender:audience==='pro'?'You · Professional':'You · Artist',text:message,...pendingTimestamp};
  state.songMessages = [...(state.songMessages || []),note];
  pendingTimestamp = null;
  persist();
  const bubble = document.createElement('div');
  bubble.className = 'bubble mine';
  const author = document.createElement('strong');
  author.textContent = note.sender;
  bubble.append(author);
  if (note.version) {
    const link = document.createElement('button');
    link.className = 'time-link';
    link.dataset.journey = 'seek';
    link.dataset.version = note.version;
    link.dataset.time = note.time;
    link.textContent = (note.version==='v1'?'V1':'V2') + ' · ' + formatSongTime(note.time);
    bubble.append(' ',link);
  }
  const body = document.createElement('p');
  body.textContent = message;
  bubble.append(body);
  $('.thread-notes').append(bubble);
  form.reset();
  $('#timestamp-label').textContent = 'Add feedback or send a message.';
  bubble.scrollIntoView({block:'nearest'});
  $('#song-message').focus();
  toast('Message added to this demo thread.');
});
