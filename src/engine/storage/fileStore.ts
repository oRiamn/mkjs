type MKSROMLOADEventTarget = EventTarget & {
	result: IDBDatabase;
};

type StoredGameData = FileReader["result"];
type GameFileCallback = (data: StoredGameData) => void;
type RomPresenceCallback = (hasRom: boolean) => void;

export const ROM_LOADED_KEY = "mkjs_rom_loaded";

export class fileStore {
	db: IDBDatabase;
	indexedDB: IDBFactory | null;
	fileCallback: GameFileCallback | null;
	static instance: fileStore;
	waitForROM!: boolean;

	constructor() {
		this.db = null!;
		this.indexedDB = null;
		this.fileCallback = null;
	}

	static getInstance() {
		if (!this.instance) {
			this.instance = new fileStore();
		}
		return this.instance;
	}

	private openDb(onReady: () => void) {
		this.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.shimIndexedDB || null;
		if (!this.indexedDB) {
			alert("IndexedDB is not available in this browser.");
			return;
		}

		const request = this.indexedDB.open("MKJS-DB", 1);
		request.onerror = window.onerror;

		request.onsuccess = (event) => {
			const target = <MKSROMLOADEventTarget>event.target;
			this.db = target.result;
			onReady();
		};

		request.onupgradeneeded = (event) => {
			const target = <MKSROMLOADEventTarget>event.target;
			this.db = target.result;
			this.db.createObjectStore("files", { keyPath: "filename" });
		};
	}

	checkRom(callback: RomPresenceCallback) {
		this.openDb(() => {
			const transaction = this.db.transaction(["files"]);
			const objectStore = transaction.objectStore("files");
			const request = objectStore.get("mkds.nds");
			request.onerror = () => callback(false);
			request.onsuccess = () => {
				const hasRom = request.result != null;
				if (hasRom) {
					localStorage.setItem(ROM_LOADED_KEY, "1");
				} else {
					localStorage.removeItem(ROM_LOADED_KEY);
				}
				callback(hasRom);
			};
		});
	}

	loadRom(callback: GameFileCallback) {
		this.openDb(() => this.loadGameFiles(callback));
	}

	promptForRom(callback: GameFileCallback) {
		this.fileCallback = callback;
		this.waitForROM = true;
		document.getElementById("fileIn")!.onchange = (...args) => this.fileInChange(...args);
		document.getElementById("fileIn")!.click();
	}

	requestGameFiles(callback: GameFileCallback) {
		this.loadRom(callback);
	}

	private loadGameFiles(callback: GameFileCallback) {
		let transaction = this.db.transaction(["files"]);
		transaction.oncomplete = function () {
			console.log("Success transaction");
		};
		let objectStore = transaction.objectStore("files");

		let request = objectStore.get("mkds.nds");
		request.onerror = function (event) {
			alert("Fatal database error!");
		};
		request.onsuccess = (event) => {
			if (request.result == null) callback(null!);
			else callback(request.result.data);
		};
	}

	private validateFiles() {
		let transaction = this.db.transaction(["files"]);
		transaction.oncomplete = function () {
			console.log("Success transaction");
		};
		let objectStore = transaction.objectStore("files");
		let request = objectStore.get("mkds.nds");
		request.onerror = () => {
			alert("Fatal database error!");
		};
		request.onsuccess = () => {
			if (request.result == null) alert("Locally storing files failed!");
		};
	}

	private fileInChange(e: Event) {
		let bFile = (e.target as HTMLInputElement).files![0];
		let bReader = new FileReader();
		bReader.onload = (e) => {
			this.waitForROM = false; //todo: verify
			this.storeGame(e.target!.result, (data) => this.fileCallback?.(data));
		};
		bReader.readAsArrayBuffer(bFile);
	}

	private storeGame(dat: StoredGameData, callback: GameFileCallback) {
		let transaction = this.db.transaction(["files"], "readwrite");
		transaction.oncomplete = function () {
			console.log("Success transaction");
		};
		let objectStore = transaction.objectStore("files");
		let request = objectStore.put({ filename: "mkds.nds", data: dat });

		request.onerror = () => {
			alert("Failed to store game locally!");
			callback(dat);
		};
		request.onsuccess = () => {
			localStorage.setItem(ROM_LOADED_KEY, "1");
			this.validateFiles();
			callback(dat);
		};
	}
}
