const releaseServices = [
  {id:'feedback', name:'Song feedback', role:'Music advice', price:45, description:'Send a voice memo, demo or finished mix to an SA Endorsed music pro.', deliverable:'Get written notes on what’s working, what to change and what to do next.', prompt:'What would you like a second opinion on?', placeholder:'I’m happy with the verses, but the chorus still feels flat.'},
  {id:'canvas', name:'Spotify Canvas', role:'Motion design', price:85, description:'Turn your artwork or footage into a short looping visual for your track on Spotify.', deliverable:'Get a vertical video loop ready to upload.', prompt:'What should the loop feel like?', placeholder:'A slow, grainy loop using the footage from my music video.'},
  {id:'artwork', name:'Cover artwork', role:'Graphic design', price:120, description:'Work with a designer on a cover that feels like the record.', deliverable:'Get a square cover file for distribution.', prompt:'What’s the idea or mood for the cover?', placeholder:'A quiet, late-night cover built around a photo from the session.'},
  {id:'photos', name:'Photo editing', role:'Photo retouching', price:60, description:'Give your artist photos a consistent look across the release.', deliverable:'Get colour-corrected and retouched images for your artwork or promo.', prompt:'What would you like changed in the photos?', placeholder:'Match the colours across three shots and keep the grain.'},
  {id:'marketing', name:'Release marketing', role:'Release planning', description:'Plan how to promote your song.', deliverable:'Share your goals so a release specialist can suggest a scope and quote.', prompt:'When is the song out, and what help do you need?', placeholder:'My single is out next month. I need a content plan and help with ads.'}
];

function releaseServicesPage() {
  return `<div class="container tracks-page release-services">
    <section class="page-title"><div class="eyebrow orange">Release support</div>
      <h1>Your song is ready. Let’s release it.</h1>
      <p>Start with whatever’s missing. Find someone to help with the visuals or plan how you’ll get the song heard.</p>
    </section>
    <section class="section release-visuals" aria-labelledby="visuals-title">
      <div class="eyebrow orange">Release visuals</div><h2 id="visuals-title">Give the release a look.</h2>
      <div class="release-visual-grid">${releaseServices.slice(1, 4).map(service=>`<article class="journey-card release-visual">
        <div class="eyebrow orange">${service.role}</div><h3>${service.name}</h3><p>${service.description}</p>
        <p class="note">${service.deliverable}</p>
        <button class="text-btn" data-release-service="${service.id}">Start a brief · ${money(service.price)} example</button>
      </article>`).join('')}</div>
    </section>
    <section class="journey-card release-feedback">
      <div><div class="eyebrow orange">Release marketing</div><h2>Get the song heard.</h2><p>Tell us when it’s out and what you want help with. That could be a content plan, paid promotion or both.</p></div>
      <button class="button outline" data-release-service="marketing">Start a marketing brief</button>
    </section>
  </div>`;
}

function songFeedbackPage() {
  return `<div class="container tracks-page"><section class="page-title"><div class="eyebrow orange">While you’re making the song</div><h1>Get feedback on your song.</h1></section>
    <section class="journey-card release-feedback" id="song-feedback">
      <div><div class="eyebrow orange">Music advice</div><h2>Need a fresh pair of ears?</h2><p>${releaseServices[0].description} ${releaseServices[0].deliverable}</p></div>
      <div><button class="button dark" data-release-service="feedback">Get song feedback</button><p class="note">Example price ${money(releaseServices[0].price)} / song</p></div>
    </section>
  </div>`;
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-release-service]');
  if (!button) return;
  const service = releaseServices.find(item => item.id === button.dataset.releaseService);
  const draft = state.releaseBriefs?.[service.id];
  openModal(`<div class="eyebrow orange">${service.role}</div><h2>${service.name}</h2>
    <p class="modal-intro">${service.deliverable} ${service.price ? 'Example price ' + money(service.price) + '.' : 'Pricing depends on scope.'} Save a demo brief on this device.</p>
    <form id="release-service-form">
      ${service.id === 'feedback' ? `<label>What are you working on?<select name="focus">${['Songwriting or demo','Production or arrangement','Vocals or mix','Final release check'].map(focus => `<option ${focus === draft?.focus ? 'selected' : ''}>${focus}</option>`).join('')}</select></label>` : ''}
      <label>${service.id === 'feedback' ? 'Private listening link' : 'Link to your release or references'} (optional)<input type="url" name="link" value="${esc(draft?.link || '')}" placeholder="https://"></label>
      <label>${service.prompt}<textarea name="notes" maxlength="1500" placeholder="${service.placeholder}" required>${esc(draft?.notes || '')}</textarea></label>
      <button class="button dark">Save demo brief</button>
    </form>`);
  $('#release-service-form').onsubmit = event => {
    event.preventDefault();
    const brief = Object.fromEntries(new FormData(event.currentTarget));
    state.releaseBriefs = {...state.releaseBriefs, [service.id]: brief};
    persist();
    closeModal();
    toast('Demo brief saved on this device.');
  };
});
