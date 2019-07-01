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
		this.getDetailsFor = 'missing'; // Can be 'missing, 'all', 'none'
		this.allPapers = [];
		
		// State variable
		this.scanning = false;
		this.matchCount = 0;
		this.paperElems = [];

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
			
			document.getElementsByTagName('body')[0].onclick = (ev) => { this.windowClickCallback(ev) };

			// Scan menu
			this.scanBtn = document.createElement('button');
			this.scanBtn.onclick = (ev) => { this.scanBtnCallback(ev) };
			this.scanBtn.innerText = 'Scan details';
			this.scanBtnDiv = document.createElement('div');
			this.scanBtnDiv.appendChild(this.scanBtn)
			this.rootElem.appendChild(this.scanBtnDiv);

			this.scanMenu = document.createElement('div');
			this.scanMenu.classList.add('btnMenu','closed');
			this.scanBtnDiv.appendChild(this.scanMenu);

			this.scanMenuItem1 = document.createElement('a');
			this.scanMenuItem1.onclick = (ev) => { this.scanItemCallback(ev, 'missing') };
			this.scanMenuItem1.innerText = 'Missing';
			this.scanMenu.appendChild(this.scanMenuItem1);
			
			this.scanMenuItem2 = document.createElement('a');
			this.scanMenuItem2.onclick = (ev) => { this.scanItemCallback(ev, 'all') };
			this.scanMenuItem2.innerText = 'All';
			this.scanMenu.appendChild(this.scanMenuItem2);
			
			this.scanMenuItem3 = document.createElement('a');
			this.scanMenuItem3.onclick = (ev) => { this.scanItemCallback(ev, 'none') };
			this.scanMenuItem3.innerText = 'None';
			this.scanMenu.appendChild(this.scanMenuItem3);
			
			// Export menu
			this.exportBtn = document.createElement('button');
			this.exportBtn.onclick = (ev) => { this.exportBtnCallback(ev) };
			this.exportBtn.innerText = 'Export';
			this.exportBtnDiv = document.createElement('div');
			this.exportBtnDiv.appendChild(this.exportBtn)
			this.rootElem.appendChild(this.exportBtnDiv);
			
			this.exportMenu = document.createElement('div');
			this.exportMenu.classList.add('btnMenu','closed');
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

			this.setMessage('Scholar Enhancer!', 10000);
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
		if (this.showMoreInterval) clearInterval(this.showMoreInterval);
		this.showMoreInterval = setInterval( () => {
			const showMoreBtn = document.getElementById('gsc_bpf_more');
			if (showMoreBtn){
				if (!showMoreBtn.disabled){
					showMoreBtn.click();
				} else {
					clearInterval(this.showMoreInterval);
				}
			}
			this.updateStats();
		}, 500);
	}

	async windowClickCallback( ev ){
		// Do NOT stop propagation
		this.scanMenu.classList.add('closed');
		this.exportMenu.classList.add('closed');
	}

	async scanBtnCallback( ev ){
		ev.stopPropagation(); // Important
		if (this.scanMenu.className.indexOf('closed') > -1){
			this.scanMenu.classList.remove('closed');
			this.exportMenu.classList.add('closed');
		} else {
			this.scanMenu.classList.add('closed');
		}
	}

	async scanItemCallback( ev, type ){
		ev.stopPropagation(); // Important
		this.getDetailsFor = type; 
		if (!this.scanning) {
			if (this.showMoreInterval) clearInterval(this.showMoreInterval);
			this.scanning = true;
			this.scanBtn.innerText = 'Stop';
			// scrapPapersO(this.maxPapers).then( (p) => { this.allPapers = p; } );
			this.scrapPapers(this.maxPapers).then( () => {
				this.scanning = false;
				this.scanBtn.innerText = 'Scan details';
			});
		} else {
			this.scanning = false;
			this.scanBtn.innerText = 'Scan details';
		}
	}
	
	async exportBtnCallback( ev ){
		ev.stopPropagation(); // Important
		if (this.exportMenu.className.indexOf('closed') > -1){
			this.exportMenu.classList.remove('closed');
			this.scanMenu.classList.add('closed');
		} else {
			this.exportMenu.classList.add('closed');
		}
	}

	async exportItemCallback( ev, type ){
		ev.stopPropagation(); // Important

		if (this.allPapers.length == 0 && this.paperElems.length > 0) { // Nothing has been scanned
			console.log('Nothing has been scanned, scanning just from the list.');
			this.scanning = true;
			const getDetailsForBU = this.getDetailsFor;
			this.getDetailsFor = 'none';
			await this.scrapPapers(this.maxPapers);
			this.scanning = false;
			this.getDetailsFor = getDetailsForBU;
		}
		
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
	
	extractInfoFromListing(e){
		const titleStr = this.getTitleElemInListing(e).innerText;
		const authorsStr = e.children[e.children.length-3].children[1].innerText;
		const publicationStr = e.children[e.children.length-3].children[2].innerText;
		const missingInfo = (
			titleStr.indexOf('...') > -1 || authorsStr.indexOf('...') > -1 || publicationStr.indexOf('...') > -1 || 
			titleStr.indexOf('…') > -1 || authorsStr.indexOf('…') > -1 || publicationStr.indexOf('…') > -1
		);
		// Parse publication string
		const pubType = (publicationStr.indexOf('conference') === -1)?'journal':'conference'; // Basic heuristic
		let pubName = publicationStr;
		const etcData = {}
		if (publicationStr.indexOf('...') === -1 && publicationStr.indexOf('…') === -1) {
			let parts = publicationStr.split(' ');
			let hasDigit = 0;
			while (/\d/.test(parts[parts.length-1-hasDigit])) { hasDigit++; }
			for (let i=0; i<hasDigit; i++){
				const part = parts[parts.length-1-i];
				if (/\d-\d/.test(part)){
					etcData['pages'] = part;
				} else if (/\((\d*)\)\,*/.test(part)) {
					const o = /\(*(\d*)\)*\,*/.exec(part);
					etcData['issue'] = o[o.length-1];
				} else if ((i === 0 && hasDigit === 3) || (i === 0 && hasDigit === 2)){
					etcData['pages'] = part;
				} else {
					const o = /\(*(\d*)\)*\,*/.exec(part);
					etcData['volume'] = o[o.length-1];
				}
			}
			pubName = parts.slice(0, parts.length-hasDigit).join(' ');
		}
		const year = e.children[e.children.length-1].children[0].innerText;
		const data = {...
			{
			"title": titleStr,
			"authors": authorsStr,
			"year": year,
			"type": pubType,
			"publication": pubName,
			"missingInfo": missingInfo
		}, ...etcData};
		return data;
	}

	extractInfoFromDetailsPage(){
		const data = {
			"title": this.getTitleElemInDetailsPage().innerText,
			"authors": document.getElementsByClassName('gs_scl')[0].children[1].innerText,
			"date": document.getElementsByClassName('gs_scl')[1].children[1].innerText
		};
		let ThirdRowName  = document.getElementsByClassName('gs_scl')[2].children[0].innerText;
		if (ThirdRowName.toLowerCase().indexOf('journal')||ThirdRowName.toLowerCase().indexOf('conference')){
			let ThirdRowValue = document.getElementsByClassName('gs_scl')[2].children[1].innerText;
			data['type'] = ThirdRowName;
			data['publication'] = ThirdRowValue;
		}
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
		return data;
	}

	async scrapPaperInfo(e){
		// const year = e.children[e.children.length-1].children[0].innerText;
		// Click on link
		let titleElem = this.getTitleElemInListing(e);
		let data = this.extractInfoFromListing(e);
		// Extract info from the highlights
		const needToGetDetails = (this.getDetailsFor === 'all') || (this.getDetailsFor === 'missing' && data['missingInfo']);
		// If needed, click to get more details
		if (needToGetDetails) {
			titleElem.click();
			console.log('Clicked on "' + titleElem.innerText.slice(0, 20) + '..."');
			await this.waitForDetailsPage(true); // Wait for opening
			data = this.extractInfoFromDetailsPage();
			const closeBtn = document.getElementById('gs_md_cita-d-x');
			closeBtn.click();
			await this.waitForDetailsPage(false); // Wait for closure
		}
		return data;
	}

	getPaperElems() {
		this.paperElems = document.getElementsByClassName('gsc_a_tr');
		this.matchCount = this.paperElems.length;
	}

	scrapPapers(maxCnt) {
		return new Promise((resolve, reject) => {
			this.getPaperElems();
			let elems = Array.from( this.paperElems );
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
		const date = (paperInfo['year'])?paperInfo['year']:paperInfo['date']
		let msgText = 'Fetched ' + paperInfo['authors'].split(',').splice(0, 1) + ', ... ' + date;
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
			if (item['date'] || item['year']) {
				const year = (item['date'])?( new Date(item['date']).getFullYear() ):item['year'];
				idBase += year;
			}
			if (item['title']) {
				const firstTitleWord = item['title'].split(' ').slice(0, 1);
				idBase += firstTitleWord;
			}
			idBase = idBase.toLowerCase();
			let itemId = idBase;
			let cnt = 0;
			while (ids.has(itemId)) { cnt++; itemId = idBase + cnt; };
			
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
					entryName = 'misc';
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
			if (item['date'] || item['year']) { itemBib += ',\n\t year = {' + 
				( (item['date'])? (new Date(item['date']).getFullYear()) : item['year'] ) 
			+ '}'; }
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
