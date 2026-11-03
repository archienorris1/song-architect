const rewardMilestone = 3;
const releaseCredit = 75;

function rosterRoute(route) {
  return ['home', 'talent', 'workspace', 'standards', 'promo', 'rewards', 'guide', 'thread', 'notifications', 'story'].includes(route) ||
    people.some(person => route === 'bio-' + person.id);
}

function repeatCount() {
  return state.repeatCompleted ? rewardMilestone : rewardMilestone - 1;
}

function rosterRank(profiles) {
  const demoScore = {eli: 84, imani: 76, maya: state.repeatCompleted ? 78 : 72, noah: 70, jules: 67, lucas: 65};
  return [...profiles].sort((a, b) => demoScore[b.id] - demoScore[a.id]);
}

function endorsement() {
  return '<span class="endorsement">SA Endorsed <small>· demo</small></span>';
}

function rosterIntro() {
  return `<aside class="roster-callout"><div>${endorsement()}<h3>A roster we would book ourselves.</h3>
    <p>We invite specialists whose work we rate and review applications from others. We check portfolio credits, discuss how they collaborate, and assess delivery on a paid trial before endorsing them.</p></div>
    <button class="button outline small" data-roster-action="standards">See how we vet</button></aside>`;
}

function bioPage(person) {
  return `<section class="bio-page">
    <div class="eyebrow orange">Song Architect / Shareable profile demo</div>
    <div class="bio-hero"><span class="bio-monogram" aria-hidden="true">${person.initials}</span>
      ${endorsement()}<h1>${person.name}</h1><p>${person.role}</p>
      <div class="tags">${person.genres.map(sound => `<span>${sound}</span>`).join('')}</div></div>
    <p class="bio-style">${person.style}</p>
    <div class="bio-links">
      <button class="button dark" data-roster-action="book" data-person="${person.id}">Book me · From ${money(person.rate)}</button>
      <a class="button outline" href="#talent">Explore the SA roster</a>
    </div>
    <div class="stage-panel bio-details"><h3>What I can help with</h3><p>${person.roles.join(' · ')}</p>
      <p>Starting at ${money(person.rate)} for ${person.unit}. Confirm the scope, turnaround and revision rounds before booking.</p>
      <div class="stage-meta"><div><small>Portfolio</small><strong>Audio samples would appear here</strong></div>
      <div><small>Artist feedback</small><strong>Verified reviews from completed bookings</strong></div></div>
      <p class="note">Fictional profile and illustrative price. No real booking or portfolio audio is attached.</p></div>
  </section>`;
}

function promoPage() {
  return `<div class="container"><section class="page-title"><div class="eyebrow orange">Professional workspace / Promo toolkit</div>
    <h1>Make it easy to book you.</h1><p>Give artists coming from your socials one place to hear your work, see your services and start a project.</p></section>
    <div class="roster-tools">
      <article class="stage-panel"><span class="eyebrow orange">01 / Link in bio</span><h3>Your booking page</h3>
      <p>Share a branded profile with your services, starting price and a direct enquiry button.</p><p class="note">Proposed perk: a lower platform fee when you bring the artist through your own link.</p>
      <div class="roster-buttons"><a class="button dark small" href="#bio-maya">Preview Maya’s page</a>
      <button class="button outline small" data-roster-action="copy-bio">Copy demo link</button></div></article>
      <article class="stage-panel"><span class="eyebrow orange">02 / Social assets</span><h3>Announce your endorsement</h3>
      <p>Download a square post graphic and copy a caption you can adapt for Instagram.</p>
      <div class="promo-art" aria-label="Sample Song Architect announcement graphic">song<br>architect<span>SA Endorsed<br>Maya Ellis / Demo</span></div>
      <div class="roster-buttons"><button class="button dark small" data-roster-action="download">Download demo graphic</button>
      <button class="button outline small" data-roster-action="caption">Get the caption</button></div></article>
      <article class="stage-panel"><span class="eyebrow orange">03 / Instagram enquiries</span><h3>Manychat flow template</h3>
      <p>A reusable DM script that gathers a brief before sending the artist to your booking page.</p>
      <ol class="modal-list"><li>Artist comments or messages <strong>RECORD</strong>.</li><li>Ask about their sound, the help they need and their budget.</li><li>Share your booking link so they can send a brief.</li></ol>
      <button class="button outline small" data-roster-action="flow">Open template</button>
      <p class="note">Copy and adapt the script in your own Manychat account.</p></article>
    </div></div>`;
}

function rewardPage() {
  const completed = repeatCount();
  const unlocked = state.repeatCompleted;
  const creditLabel = money(releaseCredit);
  const matches = rosterRank(people.filter(person => person.genres.includes('R&B / Soul') && person.roles.includes('Songwriting')));
  return `<div class="container"><section class="page-title"><div class="eyebrow orange">Repeat bookings / Interactive demo</div>
    <h1>Every project can benefit both sides.</h1><p>See what happens when an artist completes another paid song with the same professional. Example rewards and ranking rules are for discussion.</p></section>
    <div class="roster-callout"><div><h3>Maya Ellis and the same artist</h3><p>${completed} of ${rewardMilestone} qualifying songs completed</p>
    <progress max="${rewardMilestone}" value="${completed}" aria-label="Completed songs"></progress></div>
    <div class="roster-buttons"><button class="button dark small" data-roster-action="complete" ${unlocked ? 'disabled' : ''}>Complete demo booking</button>
    <button class="button outline small" data-roster-action="reset-rewards">Reset demo</button></div></div>
    <div class="roster-tools reward-tools">
      <article class="stage-panel"><span class="eyebrow orange">For the artist</span><h3>${unlocked ? creditLabel + ' release credit unlocked' : 'One more song to ' + creditLabel + ' release credit'}</h3>
        <p>After three qualifying paid songs, SA contributes towards the next production, mix, artwork or other eligible release service. The professional receives their agreed payout.</p>
        <button class="button outline small" data-roster-action="book" data-person="maya">Book Maya again</button></article>
      <article class="stage-panel"><span class="eyebrow orange">For the professional</span><h3>${unlocked ? '10%' : '12%'} fee on the next repeat booking</h3>
        <p>Illustrative fees start at 15% for an SA introduction, fall to 12% for repeat work and reach 10% after three qualifying completed songs with that artist.</p>
        <p>Successful paid projects, verified feedback and repeat clients can improve discovery for relevant briefs.</p></article>
      <article class="stage-panel"><span class="eyebrow orange">Artist search / Ranking preview</span><h3>R&amp;B / Soul songwriting</h3>
        <ol class="demo-ranking">${matches.map(person => `<li><strong>${person.name}</strong><span>${person.id === 'maya' && unlocked ? 'Repeat booking boost' : 'Matched to this brief'}</span></li>`).join('')}</ol>
        <p>Genre and service fit come first. Repeat work is one signal alongside reviews and reliable delivery. Newly endorsed talent still gets discovery space.</p>
        <button class="button outline small" data-roster-action="matched-roster">View these matches</button></article>
    </div></div>`;
}

function showPromoText(title, content) {
  openModal(`<div class="eyebrow orange">Promo toolkit / Copy and customise</div><h2>${title}</h2>
    <textarea id="promo-text" rows="7" style="width:100%" aria-label="${title}">${esc(content)}</textarea>
    <button class="button dark small" id="copy-promo-text" style="margin-top:15px">Copy text</button>`);
  $('#copy-promo-text').onclick = () => copyPromo($('#promo-text').value);
}

async function copyPromo(content) {
  try {
    await navigator.clipboard.writeText(content);
    toast('Copied to clipboard.');
  } catch {
    if ($('#promo-text')) {
      $('#promo-text').select();
      toast('Text selected. Use your copy shortcut.');
    } else {
      showPromoText('Your demo profile link', content);
    }
  }
}

async function downloadPromo() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#123bff"/><g fill="#fff5e1" font-family="Arial,sans-serif"><text x="84" y="180" font-size="94" letter-spacing="-5">song</text><text x="84" y="275" font-size="94" letter-spacing="-5">architect</text><path d="M89 320h98v16H89z"/><text x="84" y="575" font-size="48">SA ENDORSED</text><text x="84" y="692" font-size="100" font-weight="bold">Maya Ellis</text><text x="84" y="785" font-size="41">Session vocals · Toplining</text><text x="84" y="976" font-size="27">CONCEPT GRAPHIC / FICTIONAL PROFILE</text></g></svg>';
  const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
  try {
    const artwork = new Image();
    artwork.src = url;
    await artwork.decode();
    const canvas = document.createElement('canvas');
    canvas.width = artwork.width;
    canvas.height = artwork.height;
    canvas.getContext('2d').drawImage(artwork, 0, 0);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'song-architect-endorsed-demo.png';
    link.click();
  } catch {
    toast('Could not export the demo graphic. Try again.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-roster-action]');
  if (!button) return;
  const action = button.dataset.rosterAction;
  const bioLink = new URL('#bio-maya', location.href).href;
  switch (action) {
    case 'standards':
      audience = 'pro';
      go('standards');
      break;
    case 'book':
      startSong(people.find(person => person.id === button.dataset.person));
      break;
    case 'copy-bio':
      copyPromo(bioLink);
      break;
    case 'caption':
      showPromoText('Instagram announcement', 'I’m joining the Song Architect roster as a session singer and topliner. If you’re working on a song and need a lead vocal, harmonies or a melody, send me your idea through the link in my bio.\n\nDemo caption. Use after your endorsement is approved.');
      break;
    case 'flow':
      showPromoText('Manychat DM template', 'Trigger: RECORD\n\nHey! What are you working on?\n1. What style is your song?\n2. Do you need lead vocals, harmonies or toplining?\n3. What’s your budget and when do you need it?\n\nSend your brief and references here: ' + bioLink + '\n\nReplace the demo URL before publishing your flow.');
      break;
    case 'download':
      downloadPromo();
      break;
    case 'complete':
    case 'reset-rewards':
      state.repeatCompleted = action === 'complete';
      persist();
      render();
      $('[data-roster-action="reset-rewards"]').focus();
      toast(state.repeatCompleted ? 'Demo booking complete. Both rewards updated.' : 'Repeat booking demo reset.');
      break;
    case 'matched-roster':
      audience = 'artist';
      genre = 'R&B / Soul';
      role = 'Songwriting';
      search = '';
      go('talent');
      break;
  }
});
