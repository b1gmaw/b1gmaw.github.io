const sections = document.querySelectorAll('.section');
const sectBtn = document.querySelectorAll('.control');
const allSections = document.querySelector('.main-content');

const GITHUB_USER = 'b1gmaw';
// Repos that exist publicly but aren't projects
const HIDDEN_REPOS = [GITHUB_USER, 'portfolio_page', `${GITHUB_USER}.github.io`];
const ACTIVE_DAYS = 45;
// Topics set on GitHub control the portfolio
const FEATURED_TOPIC = 'featured';
const HIDE_TOPIC = 'portfolio-hide';
const CACHE_KEY = 'repo-cache-v2';
const CACHE_MS = 10 * 60 * 1000;


function showSection(id, {focus = true} = {}){
    const element = document.getElementById(id);
    if(!element || !element.classList.contains('section')) return;

    //Button active class
    sectBtn.forEach((btn) =>{
        const isCurrent = btn.dataset.id === id;
        btn.classList.toggle('active-btn', isCurrent);
        if(isCurrent) btn.setAttribute('aria-current', 'page');
        else btn.removeAttribute('aria-current');
    })

    //hide other sections
    sections.forEach((section)=>{
        section.classList.remove('active')
    })
    element.classList.add('active');
    window.scrollTo(0, 0);
    if(focus) element.focus({preventScroll: true});
    history.replaceState(null, '', id === 'home' ? location.pathname : '#' + id);
}

function PageTransitions(){
    //Any element with data-id switches section
    allSections.addEventListener('click', (e) =>{
        const trigger = e.target.closest('[data-id]');
        if(trigger) showSection(trigger.dataset.id);
    })

    const fromHash = location.hash.slice(1);
    if(fromHash) showSection(fromHash, {focus: false});

    //Theme Button
    const themeBtn = document.querySelector('.theme-btn');
    try{
        if(localStorage.getItem('theme') === 'yellow') document.body.classList.add('light-mode');
    }catch(err){}
    themeBtn.setAttribute('aria-pressed', document.body.classList.contains('light-mode'));
    themeBtn.addEventListener('click', ()=>{
        const on = document.body.classList.toggle('light-mode');
        themeBtn.setAttribute('aria-pressed', on);
        try{ localStorage.setItem('theme', on ? 'yellow' : 'dark'); }catch(err){}
    })
}


//GitHub sync for the "Now building" section and the status panel
const LANG_CLASS = {TypeScript: 'lang-ts', JavaScript: 'lang-js'};
const CONTROL_TOPICS = [FEATURED_TOPIC, HIDE_TOPIC];

// Optional decorations kept in the static fallback cards, reused on rendered ones
const extras = {};
document.querySelectorAll('.portfolio-item[data-repo]').forEach((card) =>{
    extras[card.dataset.repo] = {
        subtitle: card.querySelector('h3 small'),
        demo: card.querySelector('.demo'),
        facts: card.querySelector('.facts:not(.topics)'),
    };
})

function daysSince(iso){
    return (Date.now() - new Date(iso).getTime()) / 86400000;
}

function setPushed(card, iso){
    const time = card.querySelector('[data-pushed]');
    const badge = card.querySelector('[data-status]');
    const day = iso.slice(0, 10);
    time.dateTime = day;
    time.textContent = day;
    const active = daysSince(iso) <= ACTIVE_DAYS;
    badge.textContent = active ? 'active' : 'stable';
    badge.classList.toggle('is-stable', !active);
}

function el(tag, className, text){
    const node = document.createElement(tag);
    if(className) node.className = className;
    if(text) node.textContent = text;
    return node;
}

function safeUrl(value){
    try{
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    }catch(err){
        return null;
    }
}

//Cut at a word boundary
function shorten(text, max){
    if(text.length <= max) return text;
    const cut = text.slice(0, max);
    const space = cut.lastIndexOf(' ');
    return (space > max * .6 ? cut.slice(0, space) : cut).replace(/[\s,.;:—-]+$/, '') + '…';
}

//"Student-Management-System" reads as "Student Management System"
function displayName(name){
    return name.replace(/-/g, ' ');
}

function selectProjects(repos){
    const projects = repos
        .filter((r) => !r.fork && !r.archived && !r.private && !HIDDEN_REPOS.includes(r.name))
        .filter((r) => !(r.topics || []).includes(HIDE_TOPIC))
        .sort((a, b) => b.pushed_at.localeCompare(a.pushed_at));
    const featured = projects.find((r) => (r.topics || []).includes(FEATURED_TOPIC)) || projects[0];
    if(!featured) return {projects, featured};
    return {projects: [featured, ...projects.filter((r) => r !== featured)], featured};
}

function buildCard(repo, {featured = false} = {}){
    const card = el('article', 'portfolio-item' + (featured ? ' featured' : ''));
    card.dataset.repo = repo.name;
    const extra = extras[repo.name] || {};

    const top = el('div', 'item-top');
    const badge = el('span', 'badge');
    badge.dataset.status = '';
    const meta = el('span', 'meta');
    const bits = [repo.language || 'Code'];
    if(repo.license && repo.license.spdx_id !== 'NOASSERTION') bits.push(repo.license.spdx_id);
    if(repo.stargazers_count > 0) bits.push('★ ' + repo.stargazers_count);
    meta.append(el('span', 'lang ' + (LANG_CLASS[repo.language] || '')), bits.join(' · ') + ' · pushed ');
    const time = el('time');
    time.dataset.pushed = '';
    meta.append(time);
    top.append(badge, meta);

    const title = el('h3', '', displayName(repo.name));
    if(extra.subtitle) title.append(' ', extra.subtitle.cloneNode(true));

    card.append(top, title, el('p', 'item-desc', repo.description || 'No description yet.'));
    if(extra.demo) card.append(extra.demo.cloneNode(true));

    const topics = (repo.topics || []).filter((t) => !CONTROL_TOPICS.includes(t));
    if(extra.facts) card.append(extra.facts.cloneNode(true));
    else if(topics.length){
        const list = el('ul', 'facts topics');
        topics.forEach((t) => list.append(el('li', '', t)));
        card.append(list);
    }

    const links = el('div', 'item-links');
    const home = repo.homepage && safeUrl(repo.homepage);
    if(home){
        const open = el('a', 'main-btn small');
        open.href = home;
        open.target = '_blank';
        open.rel = 'noopener';
        const icon = el('span', 'btn-icon');
        icon.append(el('i', 'fa-solid fa-arrow-up-right-from-square'));
        open.append(el('span', 'btn-text', 'Open'), icon);
        links.append(open);
    }
    const src = el('a', 'text-link');
    src.href = repo.html_url;
    src.target = '_blank';
    src.rel = 'noopener';
    src.append(el('i', 'fa-brands fa-github'), ' Source');
    links.append(src);
    card.append(links);

    setPushed(card, repo.pushed_at);
    return card;
}

function renderProjects(repos){
    const {projects, featured} = selectProjects(repos);
    if(!projects.length) return;
    document.querySelector('.portfolios').replaceChildren(
        ...projects.map((repo) => buildCard(repo, {featured: repo === featured}))
    );

    const desc = featured.description || '';
    const gig = document.querySelector('[data-stat="side-gig"]');
    gig.replaceChildren(el('span', 'hl', displayName(featured.name)));
    if(desc) gig.append(' — ' + shorten(desc, 70));
    document.querySelector('[data-stat="repo-count"]').textContent = projects.length;
    document.querySelector('[data-stat="last-push"]').textContent =
        projects.map((r) => r.pushed_at).sort().pop().slice(0, 10);
}

function setSync(state, text){
    const sync = document.querySelector('.sync');
    sync.dataset.sync = state;
    sync.querySelector('.sync-text').textContent = text;
}

function clock(at){
    return new Date(at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

function readCache(){
    try{
        return JSON.parse(localStorage.getItem(CACHE_KEY));
    }catch(err){
        return null;
    }
}

function writeCache(cache){
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }catch(err){}
}

//Stale-while-revalidate: show cached data at once, refresh when older than CACHE_MS
async function syncRepos(){
    const cached = readCache();
    if(cached){
        renderProjects(cached.repos);
        setSync('ok', 'Live · synced ' + clock(cached.at));
        if(Date.now() - cached.at < CACHE_MS) return;
    }
    try{
        const headers = {Accept: 'application/vnd.github+json'};
        if(cached && cached.etag) headers['If-None-Match'] = cached.etag;
        const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?type=owner&sort=pushed&per_page=100`, {headers});
        const at = Date.now();
        if(res.status === 304 && cached){
            writeCache({...cached, at});
        }else if(res.ok){
            const repos = await res.json();
            renderProjects(repos);
            writeCache({at, etag: res.headers.get('ETag'), repos});
        }else{
            throw new Error('GitHub responded ' + res.status);
        }
        setSync('ok', 'Live · synced ' + clock(at));
    }catch(err){
        if(cached) setSync('error', 'Offline · last synced ' + clock(cached.at));
        else setSync('error', 'GitHub unreachable · showing saved data');
    }
}

//Boot screen: any key / click / tap dismisses it
function BootScreen(){
    const root = document.documentElement;
    const boot = document.getElementById('boot');
    if(!root.classList.contains('boot')){
        boot.remove();
        return;
    }

    const behind = document.querySelectorAll('body > :not(#boot)');
    behind.forEach((node) => node.inert = true);
    boot.querySelector('.boot-continue').focus({preventScroll: true});

    let done = false;
    function finish(){
        if(!boot.isConnected) return;
        boot.remove();
        root.classList.remove('boot');
        //Replay the current section's entry animation
        const current = document.querySelector('.section.active');
        current.classList.remove('active');
        void current.offsetWidth;
        current.classList.add('active');
        current.focus({preventScroll: true});
    }
    function dismiss(){
        if(done) return;
        done = true;
        try{ sessionStorage.setItem('booted', '1'); }catch(err){}
        behind.forEach((node) => node.inert = false);
        document.removeEventListener('keydown', dismiss);
        boot.classList.add('is-exiting');
        boot.addEventListener('animationend', (e) =>{
            if(e.target === boot) finish();
        });
        //Fallback if animations are disabled
        setTimeout(() =>{ if(boot.isConnected) finish(); }, 900);
    }

    document.addEventListener('keydown', dismiss);
    boot.addEventListener('pointerdown', dismiss);
    boot.addEventListener('click', dismiss);
}

PageTransitions();
BootScreen();
syncRepos();
