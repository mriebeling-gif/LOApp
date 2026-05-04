const searchModes = {
  phone: {
    label: 'Phone Number',
    placeholder: '+1 415 555 0101',
    sources: [
      {
        name: 'DuckDuckGo Web Results',
        url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(`"${q}"`)}`,
        summary: 'Web mentions and public pages containing the phone number.'
      },
      {
        name: 'HaveIBeenPwned Paste Search',
        url: (q) => `https://haveibeenpwned.com/`,
        summary: 'Check if related data appears in known breach records (manual check).'
      },
      {
        name: 'OpenCorporates',
        url: (q) => `https://opencorporates.com/companies?utf8=%E2%9C%93&q=${encodeURIComponent(q)}`,
        summary: 'Business records that may include public contact numbers.'
      }
    ]
  },
  name: {
    label: 'Full Name',
    placeholder: 'Jane Q Doe',
    sources: [
      {
        name: 'DuckDuckGo Web Results',
        url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(`"${q}"`)}`,
        summary: 'General web records and profiles matching the name.'
      },
      {
        name: 'LinkedIn Public Search',
        url: (q) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`,
        summary: 'Publicly visible career profiles.'
      },
      {
        name: 'OpenCorporates Officers',
        url: (q) => `https://opencorporates.com/officers?q=${encodeURIComponent(q)}`,
        summary: 'Corporate filings mentioning person names.'
      }
    ]
  },
  email: {
    label: 'Email Address',
    placeholder: 'jane@example.com',
    sources: [
      {
        name: 'Mozilla Monitor / HIBP',
        url: () => 'https://monitor.mozilla.org/',
        summary: 'Breach exposure checks for the email address.'
      },
      {
        name: 'Gravatar Profile Probe',
        url: (q) => `https://en.gravatar.com/site/check/${encodeURIComponent(q.trim().toLowerCase())}`,
        summary: 'Check for a public avatar/profile associated with the email.'
      },
      {
        name: 'DuckDuckGo Web Results',
        url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(`"${q}"`)}`,
        summary: 'Pages publicly listing the email.'
      }
    ]
  },
  address: {
    label: 'Street Address',
    placeholder: '1600 Pennsylvania Ave NW, Washington, DC',
    sources: [
      {
        name: 'OpenStreetMap Nominatim',
        url: (q) => `https://nominatim.openstreetmap.org/ui/search.html?q=${encodeURIComponent(q)}`,
        summary: 'Address normalization and map coordinates from OSM.'
      },
      {
        name: 'Zillow Search',
        url: (q) => `https://www.zillow.com/homes/${encodeURIComponent(q)}_rb/`,
        summary: 'Property context where available publicly.'
      },
      {
        name: 'DuckDuckGo Web Results',
        url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(`"${q}"`)}`,
        summary: 'General public references to the address.'
      }
    ]
  }
};

const el = {
  typeWrap: document.getElementById('searchTypes'),
  form: document.getElementById('searchForm'),
  input: document.getElementById('searchInput'),
  label: document.getElementById('searchLabel'),
  results: document.getElementById('results'),
  sourceList: document.getElementById('sourceList'),
  resultMeta: document.getElementById('resultMeta'),
  tpl: document.getElementById('resultTemplate')
};

let activeType = 'phone';

function renderModes() {
  el.typeWrap.innerHTML = '';
  Object.keys(searchModes).forEach((type) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `type-btn ${activeType === type ? 'active' : ''}`;
    btn.textContent = searchModes[type].label;
    btn.addEventListener('click', () => {
      activeType = type;
      syncInputs();
      renderModes();
      renderSources();
    });
    el.typeWrap.appendChild(btn);
  });
}

function syncInputs() {
  const mode = searchModes[activeType];
  el.label.textContent = mode.label;
  el.input.placeholder = mode.placeholder;
  el.input.value = '';
}

function renderSources() {
  const mode = searchModes[activeType];
  el.sourceList.innerHTML = mode.sources.map(s => `<li><strong>${s.name}</strong>: ${s.summary}</li>`).join('');
}

function renderResults(query) {
  const mode = searchModes[activeType];
  el.resultMeta.textContent = `Showing ${mode.sources.length} source workflows for ${mode.label}: ${query}`;
  el.results.classList.remove('empty');
  el.results.innerHTML = '';

  mode.sources.forEach((source) => {
    const frag = el.tpl.content.cloneNode(true);
    const card = frag.querySelector('.result-item');
    card.querySelector('h3').textContent = source.name;
    const link = card.querySelector('a');
    const url = source.url(query);
    link.href = url;
    link.textContent = 'Open source';
    card.querySelector('.result-summary').textContent = source.summary;
    card.querySelector('.result-raw').textContent = JSON.stringify({
      searchType: activeType,
      query,
      source: source.name,
      action: 'Open link and review matching records manually or with your own API integrations.'
    }, null, 2);
    el.results.appendChild(frag);
  });
}

el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = el.input.value.trim();
  if (!query) return;
  renderResults(query);
});

renderModes();
syncInputs();
renderSources();

