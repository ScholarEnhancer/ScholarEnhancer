class paperInfo {
	constructor(data){
		
	}
	getBibtexEntry(){

	}
}

function saveTextToFile(text, fileName) {
	const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
	if (!fileName) { fileName = 'export.json'; }
	saveAs(blob, fileName);
}

function exportObjectAsJSON( object, fileName = null ) {
	const exportJSON = JSON.stringify(object, null, 2);
	saveTextToFile(exportJSON, fileName);
}

class ScholarEnhancer {
	constructor() {
		this.maxPapers = null; 
		this.detailsWaitInterval = 50; // In ms
		this.allPapers = [];
		
		// State variable
		this.scanning = false;
		this.matchCount = 0;

		// Ui components
		this.rootElem = null;
		this.showAllBtn = null;
		this.scanBtn = null;
		this.exportBtn = null;
		this.msgElem = null;
		
		this.statsElem = null;
		
		// Timers
		this.msgTimeout = null;
		this.showMoreInterval = null;
		this.detailPageWaitInterval = null;


		this.createUI();
	}

	getUIRoot() {
		return document.getElementById('ScholarEnhancerRoot');
	}

	createUI() {
		if (!this.getUIRoot()) {
			const winLoc = window.location.href;
			if ((winLoc.indexOf('scholar.google.com/citations') === -1) || (winLoc.indexOf('user=') == -1)) { return; }

			// Create UI
			this.rootElem = document.createElement('div');
			this.rootElem.id = 'ScholarEnhancerRoot';
			document.getElementsByTagName('body')[0].appendChild(this.rootElem);
			
			this.closeBtn = document.createElement('button');
			this.closeBtn.onclick = (ev) => { this.rootElem.classList.add('closed') };
			this.closeBtn.innerText = 'x';
			this.closeBtn.className = 'closeBtn';
			let containerDiv = document.createElement('div');
			containerDiv.appendChild(this.closeBtn);
			this.rootElem.appendChild(containerDiv);
			
			this.showAllBtn = document.createElement('button');
			this.showAllBtn.onclick = (ev) => { this.showAllBtnCallback(ev) };
			this.showAllBtn.innerText = 'Show All';
			containerDiv = document.createElement('div');
			containerDiv.appendChild(this.showAllBtn);
			this.rootElem.appendChild(containerDiv);
			
			this.scanBtn = document.createElement('button');
			this.scanBtn.onclick = (ev) => { this.scanBtnCallback(ev) };
			this.scanBtn.innerText = 'Scan';
			containerDiv = document.createElement('div');
			containerDiv.appendChild(this.scanBtn);
			this.rootElem.appendChild(containerDiv);
			
			this.exportBtn = document.createElement('button');
			this.exportBtn.onclick = (ev) => { this.exportBtnCallback(ev) };
			this.exportBtn.innerText = 'Export';
			this.exportBtnDiv = document.createElement('div');
			this.exportBtnDiv.appendChild(this.exportBtn)
			this.rootElem.appendChild(this.exportBtnDiv);
			
			this.exportMenu = document.createElement('div');
			this.exportMenu.classList.add('btnMenu');
			this.exportMenu.classList.add('closed');
			this.exportBtnDiv.appendChild(this.exportMenu);
			
			this.exportMenuItem1 = document.createElement('a');
			this.exportMenuItem1.onclick = (ev) => { this.exportItemCallback(ev, 'bibtex') };
			this.exportMenuItem1.innerText = 'BibTeX';
			this.exportMenu.appendChild(this.exportMenuItem1);

			this.exportMenuItem2 = document.createElement('a');
			this.exportMenuItem2.onclick = (ev) => { this.exportItemCallback(ev, 'json') };
			this.exportMenuItem2.innerText = 'JSON';
			this.exportMenu.appendChild(this.exportMenuItem2);

			this.exportMenuItem3 = document.createElement('a');
			this.exportMenuItem3.onclick = (ev) => { this.exportItemCallback(ev, 'coauthors') };
			this.exportMenuItem3.innerText = 'Co-authors';
			this.exportMenu.appendChild(this.exportMenuItem3);

			this.statsElem = document.createElement('span');
			this.rootElem.appendChild(this.statsElem);

			this.msgElem = document.createElement('span');
			this.rootElem.appendChild(this.msgElem);

			this.setMessage('Scholar Enhancer is ready!', 10000);
			this.updateStats();
		}
	}

	setMessage(txt, timeout = 0, className = 'normal'){
		this.msgElem.innerText = txt;
		this.msgElem.className = className;
		if (timeout){
			if (this.msgTimeout) {
				clearTimeout(this.msgTimeout);
			}
			this.msgTimeout = setTimeout( () => {
				this.msgElem.innerText = '';
				this.msgTimeout = null;
			}, timeout);
		}
	}

	updateStats(){
		this.getPaperElems();
		let statText;
		if (this.scanning || this.allPapers.length){
			statText = this.allPapers.length + ' of ' + this.matchCount + ' extracted';
		} else {
			statText = this.matchCount + ' papers';
		}
		this.statsElem.innerText = statText;
	}

	async showAllBtnCallback( ev ){
		ev.stopPropagation(); // Important
		if (this.showMoreInterval) clearInterval(this.detailPageWaitInterval);
		this.showMoreInterval = setInterval( () => {
			const showMoreBtn = document.getElementById('gsc_bpf_more');
			if (showMoreBtn && !showMoreBtn.disabled) {
				showMoreBtn.click();
			}
			this.updateStats();
			if (showMoreBtn && showMoreBtn.disabled) { clearInterval(this.detailPageWaitInterval); }
		}, 500);
	}

	async scanBtnCallback( ev ){
		ev.stopPropagation(); // Important
		if (!this.scanning) {
			this.scanning = true;
			this.scanBtn.innerText = 'Stop';
			// scrapPapersO(this.maxPapers).then( (p) => { this.allPapers = p; } );
			this.scrapPapers(this.maxPapers).then( () => {
				this.scanning = false;
				this.scanBtn.innerText = 'Scan';
			});
		} else {
			this.scanning = false;
			this.scanBtn.innerText = 'Scan';
		}
	}

	async exportBtnCallback( ev ){
		ev.stopPropagation(); // Important
		if (this.exportMenu.className.indexOf('closed') > -1){
			this.exportMenu.classList.remove('closed');
		} else {
			this.exportMenu.classList.add('closed');
		}
	}

	async exportItemCallback( ev, type ){
		ev.stopPropagation(); // Important
		const nameElem = document.getElementById('gsc_prf_in');
		
		if (type === 'bibtex') {
			let saveFileName = (nameElem)?(nameElem.innerText+'.bib'):'export.bib';
			saveTextToFile(this.getBibtex(), saveFileName);
		} else if (type === 'json') {
			let saveFileName = (nameElem)?(nameElem.innerText+'.json'):'export.json';
			exportObjectAsJSON(this.allPapers, saveFileName);
		} else if (type === 'coauthors') {
			let allAuthors = '';
			this.allPapers.forEach( a => allAuthors += a["authors"] + '\n' );
			const names = allAuthors.split(/\n|\,/).map(s => s.trim(s)).filter(s => s.length);
			const namesUnique = [...new Set(names)]; 
			const fileContent = namesUnique.join('\n');

			let saveFileName = (nameElem)?(nameElem.innerText):'';
			saveFileName += '_coauthors.txt';
			saveTextToFile(fileContent, saveFileName);
		}
		this.exportMenu.classList.add('closed');
	}

	async waitForDetailsPage(forOpen){
		return new Promise((resolve, reject) => {
			if (this.detailPageWaitInterval) clearInterval(this.detailPageWaitInterval);
			this.detailPageWaitInterval = setInterval( () => {
				let isOpen = (this.getTitleElemInDetailsPage()) && document.querySelectorAll('.gs_md_wnw.gs_md_wmw.gs_vis').length > 0;
				if (isOpen === forOpen) {
					clearInterval(this.detailPageWaitInterval);
					return resolve(isOpen);
				}
			}, this.detailsWaitInterval);
		});
	}

	getTitleElemInDetailsPage(e){
		if (document.querySelector('.gsc_vcd_title_link')) {
			return document.querySelector('.gsc_vcd_title_link'); // Has link
		} else {
			return document.querySelector('#gsc_vcd_title'); // No link
		}
	}

	getTitleElemInListing(e){
		return e.children[e.children.length-3].children[0];
	}

	async scrapPaperInfo(e){
		// const year = e.children[e.children.length-1].children[0].innerText;
		// Click on link
		let titleElem = this.getTitleElemInListing(e);
		titleElem.click();
		console.log('Clicked on "' + titleElem.innerText.slice(0, 20) + '..."');
		await this.waitForDetailsPage(true); // Wait for opening
		const data = {
			"title": this.getTitleElemInDetailsPage().innerText,
			"authors": document.getElementsByClassName('gs_scl')[0].children[1].innerText,
			"date": document.getElementsByClassName('gs_scl')[1].children[1].innerText,
			"type": document.getElementsByClassName('gs_scl')[2].children[0].innerText,
			"publication": document.getElementsByClassName('gs_scl')[2].children[1].innerText,
		};
		const urlElem = document.getElementsByClassName('gsc_vcd_title_link');
		if (urlElem.length > 0) { data["url"] = urlElem[0].href; }
		const detailRows = document.querySelectorAll('#gsc_vcd_table .gs_scl');
		Array.from(detailRows).forEach( rowElem => {
			const name = rowElem.children[0].innerText.toLowerCase();
			if ((name === 'volume') || (name === 'issue') || (name === 'pages') || (name === 'publisher') || (name === 'description')){
				const value = rowElem.children[1].innerText.trim();
				if (name === 'description'){
					data['abstract'] = value;
				} else {
					data[name] = value;
				}
			} else if (name === 'total citations') {
				const value = rowElem.children[1].children[0].innerText.trim();
				data['citations'] = value.replace('Cited by', '').trim();
			}
		});
		const closeBtn = document.getElementById('gs_md_cita-d-x');
		closeBtn.click();
		await this.waitForDetailsPage(false); // Wait for closure
		return data;
	}

	getPaperElems() {
		let elems = Array.from(document.getElementsByClassName('gsc_a_tr'));
		this.matchCount = elems.length;
		return elems;
	}

	scrapPapers(maxCnt) {
		return new Promise((resolve, reject) => {
			let elems = this.getPaperElems();
			if (maxCnt) {
				elems = elems.slice(0, maxCnt);
			}
			this.clearPapers();
			let result = Promise.resolve();
			elems.forEach( (e, i) => {
				result = result.then(async () => {
					let a = await this.scrapPaperInfo(e);
					// let a = await scrapPaperInfoO(e);
					this.addPaper( a );
					if ((i === (elems.length-1)) || !this.scanning) {
						return resolve();
					}
				});
			});
		});
	}

	addPaper( paperInfo ){
		this.allPapers.push(paperInfo);
		let msgText = 'Fetched ' + paperInfo['authors'].split(',').splice(0, 1) + ', ... ' + paperInfo['date'];
		this.setMessage(msgText, 1000);
		this.updateStats();
	}

	clearPapers( ) {
		this.allPapers = [];
		this.updateStats();
	}

	getCoauthors(){
		let allAuthors = '';
		this.allPapers.forEach( a => allAuthors += a["authors"] + '\n' );
		let names = allAuthors.split(/\n|\,/).map(s => s.trim(s)).filter(s => s.length);
		let list = '';
		for (let i = 0; i<names.length; i++) {
			const w = names[i].split(' ');
			let o = w;
			if (w.length >= 2) {
				let wn = w.slice(-1).concat(w.slice(0, -1));
				wn = wn.map( (s, i) => ( (i<=1)?(s):(s[0]) ) );
				o = wn.join(', ');
			}
			list += o + '\n';
		}
	}

	getAuthorsAsLastFirstName(authors) {
		let names = authors.split(/\n|\,/).map(s => s.trim(s)).filter(s => s.length);
		let list = [];
		for (const n of names) {
			let o = n;
			const w = n.split(' ');
			if (w.length >= 2) {
				const lastName = w.slice(-1);
				const OtherNames = w.slice(0, -1);
				o = lastName + ', ' + OtherNames.join(' ');
			}
			list.push(o);
		}
		return list;
	}

	getBibtex() {
		let bib = '';
		let ids = new Set();
		for (const item of this.allPapers) {
			let itemBib = '';

			let idBase = '';
			if (item['authors']) {
				const firstAuthLN = item['authors'].split(',').slice(0,1)[0].trim().split(' ').slice(-1)[0];
				idBase += firstAuthLN;
			}
			if (item['date']) {
				const year = new Date(item['date']).getFullYear();
				idBase += year;
			}
			if (item['title']) {
				const firstTitleWord = item['title'].split(' ').slice(0, 1);
				idBase += firstTitleWord;
			}
			idBase = idBase.toLowerCase();
			let itemId = idBase;
			let cnt = 0;
			while (itemId in ids) { cnt++; itemId = idBase + cnt };
			
			let entryName;
			let publicationName = '';
			let publisherName = '';
			switch (item["type"].toLowerCase()){
				case 'journal': 
					entryName = 'article'; 
					publicationName = 'journal'; 
					publisherName = 'publisher'; 
					break;
				case 'conference': 
					entryName = 'inproceedings'; 
					publicationName = 'booktitle'; 
					publisherName = 'organization'; 
					break;
				default: 
					entryName = item["type"].toLowerCase();
					publicationName = 'howpublished'; 
					publisherName = 'publisher'; 
			}
			
			itemBib = '@' + entryName + '{' + itemId;
			// Add info
			itemBib += ',\n\t title = {' + item['title'] + '}';
			itemBib += ',\n\t author = {' + this.getAuthorsAsLastFirstName(item['authors']).join(' and ') + '}';
			itemBib += ',\n\t ' + publicationName + ' = {' + item['publication'] + '}';
			if (item['volume']) { itemBib += ',\n\t volume = {' + item['volume'] + '}'; }
			if (item['issue']) { itemBib += ',\n\t number = {' + item['issue'] + '}'; }
			if (item['pages']) { itemBib += ',\n\t pages = {' + item['pages'] + '}'; }
			if (item['publisher']) { itemBib += ',\n\t ' + publisherName + ' = {' + item['publisher'] + '}'; }
			if (item['date']) { itemBib += ',\n\t year = {' + (new Date(item['date']).getFullYear()) + '}'; }
			if (item['url']) { itemBib += ',\n\t url = {' + item['url'] + '}'; }
			itemBib += '\n}\n';

			ids.add(itemId);

			bib += itemBib + '\n';
		}
		return bib;
	}
}

if (window.SS === undefined){
	window.SS = new ScholarEnhancer();
}
