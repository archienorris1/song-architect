const trackPackages = {
  license: {name:'Track license', price:49, description:'A non-exclusive license to write, record and release one song with this instrumental.'},
  mix: {name:'License + vocal mix', price:149, description:'The track license and a mix of your recorded vocals with the original instrumental stems.'},
  finish: {name:'License + production, mix & master', price:349, description:'The track license, arrangement changes around your performance, and a finished mix and master.'}
};

let trackPackage = 'license';

function tracksPage() {
  const selected = trackPackages[trackPackage];
  return `<div class="container tracks-page">
    <section class="page-title"><div class="eyebrow orange">Song Architect Tracks</div>
      <h1>Find a track to write to.</h1><p>Hear the instrumental first. Write your song, then bring the original producer back in if you want help finishing it.</p>
    </section>
    <div class="track-layout">
      <article class="journey-card track-preview"><div class="track-cover" aria-hidden="true"><span>SA / 001</span><b>Daylight</b></div>
        <div class="track-details"><p class="eyebrow">Instrumental preview</p><h2>Daylight</h2><p>Indie pop · 125 BPM · A minor</p>
        <audio controls preload="metadata" aria-label="Listen to Daylight" src="assets/daylight-v2.wav"></audio>
        <p class="note">Short demo instrumental. Eli Morgan is an illustrative producer profile.</p>
        <a class="text-btn" href="#bio-eli">Meet the producer</a></div>
      </article>
      <section class="journey-card"><h2>Choose what you need.</h2>
        <fieldset class="track-packages"><legend class="visually-hidden">Choose a package</legend>
        ${Object.entries(trackPackages).map(([id, item])=>`<label class="track-package"><input type="radio" name="track-package" value="${id}" ${id===trackPackage?'checked':''}><span><strong>${item.name}</strong><small>${item.description}</small></span><b>${money(item.price)}</b></label>`).join('')}
        </fieldset>
        <button class="button dark" id="track-brief">Start a brief with Eli · ${money(selected.price)}</button>
        <p class="note">Illustrative packages. In a live listing, you’d review usage rights, credits, splits and deliverables before paying.</p>
      </section>
    </div>
    <section class="track-note"><h2>Bring your vocals to the producer who made the track.</h2><p>Eli has the drums, bass and instruments on separate tracks. That lets him make space for your voice, reshape the arrangement around your melody and mix the whole song together.</p></section>
  </div>`;
}

document.addEventListener('change', event => {
  if (event.target.name !== 'track-package') return;
  trackPackage = event.target.value;
  $('#track-brief').textContent = 'Start a brief with Eli · ' + money(trackPackages[trackPackage].price);
});

document.addEventListener('click', event => {
  if (!event.target.closest('#track-brief')) return;
  const selected = trackPackages[trackPackage];
  startSong(people.find(person => person.id === 'eli'));
  const fields = $('#brief-form').elements;
  fields.start.value = trackPackage === 'mix' ? 'I need mixing / mastering' : 'A produced track';
  fields.brief.value = 'Track: Daylight. Selected package: ' + selected.name + ' (' + money(selected.price) + ', demo price).';
});
