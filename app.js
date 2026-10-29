const sections = document.querySelectorAll('.section');
const sectBtn = document.querySelectorAll('.control');
const allSections = document.querySelector('.main-content');

const GITHUB_USER = 'b1gmaw';
// Repos that exist publicly but aren't projects
const HIDDEN_REPOS = [GITHUB_USER, 'portfolio_page', `${GITHUB_USER}.github.io`];
const ACTIVE_DAYS = 45;
const CACHE_KEY = 'repo-cache-v1';
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


//GitHub sync for the "Now building" section
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

function buildCard(repo){
    const card = el('article', 'portfolio-item is-new');
    card.dataset.repo = repo.name;

    const top = el('div', 'item-top');
    const badge = el('span', 'badge');
    badge.dataset.status = '';
    const meta = el('span', 'meta');
    meta.append(el('span', 'lang'), (repo.language || 'Code') + ' · pushed ');
    const time = el('time');
    time.dataset.pushed = '';
    meta.append(time);
    top.append(badge, meta);

    const links = el('div', 'item-links');
    const src = el('a', 'text-link');
    src.href = repo.html_url;
    src.target = '_blank';
    src.rel = 'noopener';
    src.append(el('i', 'fa-brands fa-github'), ' Source');
    links.append(src);

    card.append(top, el('h3', '', repo.name), el('p', 'item-desc', repo.description || 'No description yet.'), links);
    setPushed(card, repo.pushed_at);
    return card;
}

function applyRepos(repos){
    const list = document.querySelector('.portfolios');
    const projects = repos.filter((r) => !r.fork && !r.archived && !r.private && !HIDDEN_REPOS.includes(r.name));

    projects.forEach((repo) =>{
        const card = list.querySelector(`[data-repo="${CSS.escape(repo.name)}"]`);
        if(card) setPushed(card, repo.pushed_at);
        else list.append(buildCard(repo));
    })

    document.querySelector('[data-stat="repo-count"]').textContent = projects.length;
    if(projects.length){
        const latest = projects.map((r) => r.pushed_at).sort().pop();
        document.querySelector('[data-stat="last-push"]').textContent = latest.slice(0, 10);
    }
}

function setSync(state, text){
    const sync = document.querySelector('.sync');
    sync.dataset.sync = state;
    sync.querySelector('.sync-text').textContent = text;
}

function readCache(){
    try{
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
        if(cached && Date.now() - cached.at < CACHE_MS) return cached;
    }catch(err){}
    return null;
}

async function syncRepos(){
    const cached = readCache();
    if(cached){
        applyRepos(cached.repos);
        setSync('ok', 'Live · synced ' + new Date(cached.at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}));
        return;
    }
    try{
        const res = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?type=owner&sort=pushed&per_page=100`, {
            headers: {Accept: 'application/vnd.github+json'}
        });
        if(!res.ok) throw new Error('GitHub responded ' + res.status);
        const repos = await res.json();
        applyRepos(repos);
        const at = Date.now();
        try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify({at, repos})); }catch(err){}
        setSync('ok', 'Live · synced ' + new Date(at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}));
    }catch(err){
        setSync('error', 'GitHub unreachable · showing saved data');
    }
}

PageTransitions();
syncRepos();
