const { Plugin, PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_SETTINGS = {
	showFilter: true,
	interceptClick: false,
	fontSize: '',
	itemPadding: '',
	itemMargin: '',
	treeIndent: '',
	showHeadings: false,
	maxHeadingLevel: 'H3',
	autoExpandLevel: 'H2',
	arrowExpands: 'Next level',
	searchHeadings: false,
	recursiveCollapse: false,
	iconSet: 'default',
	focusWithShift: true,
	focusPaneHotkey: true
}

const MATERIAL_ICONS = {
  md: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#7C3AED" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z"/><path fill="#C4B5FD" d="M13 3.5V9h5.5L13 3.5z"/><path fill="#fff" d="M7 15h2.5v-3l1.5 2 1.5-2v3H15v-6h-1.5l-2 2.5L9 9H7v6z"/></svg>`,
  js: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="2" fill="#F7DF1E"/><path fill="#000" d="M7.5 17.5c.4.7 1 1.2 2 1.2 1.1 0 1.8-.5 1.8-1.7V12H9.6v5c0 .5-.2.7-.6.7-.4 0-.6-.2-.8-.5zm5.3-.3c.5.8 1.2 1.5 2.5 1.5 1.4 0 2.3-.7 2.3-1.9 0-1.1-.6-1.6-1.8-2.1l-.4-.2c-.6-.3-.9-.4-.9-.8 0-.3.2-.5.6-.5s.6.2.9.6l1.1-1c-.6-.9-1.3-1.2-2.1-1.2-1.3 0-2.1.8-2.1 1.9 0 1.1.6 1.6 1.7 2.1l.4.2c.7.3 1 .5 1 .9 0 .4-.3.6-.8.6s-.9-.3-1.2-.8z"/></svg>`,
  ts: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="2" fill="#3178C6"/><path fill="#fff" d="M5 12v1.5h3V20h1.8v-6.5H13V12H5zm9.3 0c-1.5 0-2.5.8-2.5 2 0 1.1.7 1.7 1.9 2.2l.4.1c.8.3 1.1.5 1.1 1s-.4.7-.9.7c-.6 0-1-.3-1.3-.9L11.6 18c.5 1 1.4 1.6 2.7 1.6 1.6 0 2.7-.9 2.7-2.2 0-1.2-.7-1.8-2-2.3l-.4-.1c-.7-.3-1-.5-1-.9s.3-.6.7-.6c.4 0 .7.2.9.6z"/></svg>`,
  py: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#3776AB" d="M12 2C6.5 2 7 4.5 7 4.5V7h5.1v.8H5S2 7.4 2 12s2.5 4.8 2.5 4.8H5.8v-2.3S5.6 12 8 12h7.8s2.2.1 2.2-2.1V6.2S18.4 2 12 2zm-1.4 1.5c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9z"/><path fill="#FFC107" d="M12 22c5.5 0 5-2.5 5-2.5V17h-5.1v-.8H19s3 .4 3-4.2-2.5-4.8-2.5-4.8h-1.3v2.3S18.4 12 16 12H8.2S6 11.9 6 14.1v3.7S5.6 22 12 22zm1.4-1.5c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z"/></svg>`,
  json: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FBC02D" d="M5 3c-1.1 0-2 .9-2 2v3c0 1.1-.9 2-2 2v2c1.1 0 2 .9 2 2v3c0 1.1.9 2 2 2h2v-2H5v-3.5c0-1.1-.5-2-1.3-2.5.8-.5 1.3-1.4 1.3-2.5V5h2V3H5zm14 0h-2v2h2v3.5c0 1.1.5 2 1.3 2.5-.8.5-1.3 1.4-1.3 2.5V19h-2v2h2c1.1 0 2-.9 2-2v-3c0-1.1.9-2 2-2v-2c-1.1 0-2-.9-2-2V5c0-1.1-.9-2-2-2zm-7 11c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zm-3 0c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zm6 0c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1z"/></svg>`,
  css: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#2196F3" d="M5 3l-1.5 16.5L12 21l8.5-1.5L22 3H5zm12.6 5H8.9l.2 2.4h8.3l-.8 7.5L12 19l-4.6-1.1-.3-3.5h2.4l.2 1.8 2.3.6 2.3-.6.3-3H7.5L7 8H17.6l-.2-2.4H6.7L6.5 3H17.8z"/></svg>`,
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#E44D26" d="M5 3l-1.5 16.5L12 21l8.5-1.5L22 3H5zm11.8 13.5L12 18l-4.8-1.5L6.4 9H12v2H8.6l.3 3.1L12 15.1l3.1-.9.3-3.1H12V9h5.6z"/></svg>`,
  png: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="2" fill="#43A047"/><circle cx="8.5" cy="8.5" r="1.5" fill="#fff"/><path fill="#fff" d="M21 15l-5-5-4 4-2-2-5 5v2h16z" opacity=".9"/></svg>`,
  jpg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="2" fill="#2E7D32"/><circle cx="8.5" cy="8.5" r="1.5" fill="#fff"/><path fill="#fff" d="M21 15l-5-5-4 4-2-2-5 5v2h16z" opacity=".9"/></svg>`,
  pdf: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#F44336" d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .8-.7 1.5-1.5 1.5H9v2H7.5V7H10c.8 0 1.5.7 1.5 1.5v1zm5 2c0 .8-.7 1.5-1.5 1.5h-2.5V7H15c.8 0 1.5.7 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/><path fill="#EF9A9A" d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg>`,
  default_file: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#90A4AE" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>`,
  folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#90A4AE" d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/><path fill="#B0BEC5" d="M4 10h16v8H4z" opacity=".3"/></svg>`
};

const VSCODE_ICONS = {
  md: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M2 5v22h28V5H2zm24.5 16l-4.5-4v3h-3v-5l-4.5 6V9h3v5.5l4.5-6h2v3l4.5 4v-4.5l-2-1.5v-3l4 3v10zM5.5 10.5h3v7h2v-7h3V21h-8v-10.5z" fill="#519aba"/></svg>`,
  js: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M2 5v22h28V5H2zm19.8 17.4c-1.1 1.1-2.9 1.7-4.9 1.7-2 0-3.6-.6-4.6-1.5v-3.3c.9.8 2.2 1.4 3.7 1.4 1.2 0 1.9-.4 1.9-1 0-.6-.5-1-2.1-1.4-2.8-.7-4.4-1.9-4.4-4.2 0-2 1.6-3.8 4.6-3.8 1.8 0 3.2.5 4.1 1.2l-1.6 3c-.8-.6-1.8-1.1-2.9-1.1-.9 0-1.4.3-1.4.9 0 .5.4.8 2 1.3 2.9.7 4.5 2.1 4.5 4.3 0 1.3-.4 2.5-1.2 3.4L21.8 22.4zM9.4 23.4h-3.4V10.7h3.4v12.7z" fill="#cbcb41"/></svg>`,
  ts: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M2 5v22h28V5H2zm19.8 17.4c-1.1 1.1-2.9 1.7-4.9 1.7-2 0-3.6-.6-4.6-1.5v-3.3c.9.8 2.2 1.4 3.7 1.4 1.2 0 1.9-.4 1.9-1 0-.6-.5-1-2.1-1.4-2.8-.7-4.4-1.9-4.4-4.2 0-2 1.6-3.8 4.6-3.8 1.8 0 3.2.5 4.1 1.2l-1.6 3c-.8-.6-1.8-1.1-2.9-1.1-.9 0-1.4.3-1.4.9 0 .5.4.8 2 1.3 2.9.7 4.5 2.1 4.5 4.3 0 1.3-.4 2.5-1.2 3.4L21.8 22.4zM12 10.7H5V13.6h2.5v9.8h3v-9.8H12v-2.9z" fill="#519aba"/></svg>`,
  py: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M15.8 2C9.5 2 10 4.8 10 4.8v3h5.7v1H8S4.5 9 4.5 14s3 5.5 3 5.5h1.5v-2.6S9 14 11.5 14h6.5s2.5.1 2.5-2.5V7s0-5-4.7-5zM14.2 4c.6 0 1.2.5 1.2 1.2s-.5 1.2-1.2 1.2-1.2-.5-1.2-1.2S13.5 4 14.2 4z"/><path d="M16 29c6 0 5.7-2.8 5.7-2.8v-3h-6v-1h7.8s3.5-.2 3.5-5.2-3-5.5-3-5.5h-1.5v2.6s0 2.9-2.5 2.9h-6.5s-2.5 0-2.5 2.5V25s0 4 5 4zm1.5-2c-.6 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2z" fill="#ffc107"/></svg>`,
  json: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M5 6v20h22V6H5zm3 3h3v14H8V9zm12 0h3v14h-3V9zm-5 5h3v4h-3v-4z" fill="#cbcb41"/></svg>`,
  css: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M6 3l-1.5 17L16 24l11.5-4L26 3H6zm14 6h-6.5l.2 2.5h6l-.8 7.5-3.9 1-3.9-1-.3-3.5h2.5l.2 1.5 1.5.5 1.5-.5.2-2.5H9.5L9 9H20.3L20 9z" fill="#519aba"/></svg>`,
  html: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M6 3l-1.5 17L16 24l11.5-4L26 3H6zm13.5 14L16 19l-4.5-1.5-.5-3.5h2.5l.2 1.5 2.3.5 2.3-.5.2-2.5H10V9h9.5v2.5h-6.5l.2 2.5h6l-.7 3z" fill="#e34c26"/></svg>`,
  png: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 6v20h24V6H4zm18 3c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3zm-13 14l5-6 3 4 5-7 5 9H9z" fill="#a074c4"/></svg>`,
  jpg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 6v20h24V6H4zm18 3c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3zm-13 14l5-6 3 4 5-7 5 9H9z" fill="#a074c4"/></svg>`,
  pdf: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M22 2H8C6.3 2 5 3.3 5 5v22c0 1.7 1.3 3 3 3h16c1.7 0 3-1.3 3-3V9l-5-7zM15 22h-3v-4h3c1.1 0 2 .9 2 2s-.9 2-2 2zm6-3h-3v1h2v1h-2v2h-1v-6h4v2zm-12 5H8v-6h2c1.1 0 2 .9 2 2s-.9 2-2 2z" fill="#d32f2f"/></svg>`,
  default_file: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H8C6.3 2 5 3.3 5 5v22c0 1.7 1.3 3 3 3h16c1.7 0 3-1.3 3-3V9l-7-7z" fill="#90a4ae"/></svg>`,
  folder: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M14 4H4C2.9 4 2 4.9 2 6v20c0 1.1.9 2 2 2h24c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-10l-2-2z" fill="#519aba"/></svg>`
};

const PHOSPHOR_ICONS = {
  md: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M216 40H40a16 16 0 00-16 16v144a16 16 0 0016 16h176a16 16 0 0016-16V56a16 16 0 00-16-16zm0 160H40V56h176v144zM88 104v56a8 8 0 01-16 0v-30l-14.3 14.3a8.1 8.1 0 01-11.4 0L32 130v30a8 8 0 01-16 0v-56a8 8 0 0113.7-5.7l22.3 22.4 22.3-22.4A8 8 0 0188 104zm112 16v16a32 32 0 01-32 32h-8v-64h8a32 32 0 0132 16zm-16 8a16 16 0 00-16-16h-8v48h8a16 16 0 0016-16zm56-8a8 8 0 01-8 8h-16v24a8 8 0 01-16 0v-24h-16a8 8 0 010-16h48a8 8 0 018 8z"/></svg>`,
  js: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M216 40H40a16 16 0 00-16 16v144a16 16 0 0016 16h176a16 16 0 0016-16V56a16 16 0 00-16-16zm-48 136a24 24 0 01-44 14l-6.2-9.2a8 8 0 0113.3-8.9l6 8.8A8 8 0 00144 176a8 8 0 005.1-14.2L128 144a24 24 0 0113.7-44A24 24 0 01188 116a8 8 0 01-14.2 7.5A8 8 0 00168 116a8 8 0 00-5.1 14.2L184 148a24.1 24.1 0 01-16 28zM96 176a8 8 0 01-8 8A24 24 0 0164 160V104a8 8 0 0116 0v56a8 8 0 008 8 8 8 0 018 8z"/></svg>`,
  ts: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M216 40H40a16 16 0 00-16 16v144a16 16 0 0016 16h176a16 16 0 0016-16V56a16 16 0 00-16-16zm-36 132.8a24 24 0 01-38 10.3l-6.3-9a8 8 0 0113.1-9.2l6.1 8.8a8 8 0 0012.3-10.7l-21.2-18A24 24 0 01156.4 102a24.2 24.2 0 0122 13 8 8 0 01-14.1 7.7 8 8 0 00-13.8 2.6 8 8 0 003 9.4l21.2 18a24 24 0 015.3 20.1zM112 112h-16v64a8 8 0 01-16 0v-64H64a8 8 0 010-16h48a8 8 0 010 16z"/></svg>`,
  py: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M214.2 117.8l-34-34A15.9 15.9 0 00168.9 79H87.1A15.9 15.9 0 0075.8 83.8l-34 34a16.1 16.1 0 000 22.4l34 34a15.9 15.9 0 0011.3 4.8h81.8a15.9 15.9 0 0011.3-4.8l34-34a16.1 16.1 0 000-22.4zm-127 49.3L53.3 133l33.9-34H120v40a8 8 0 008 8h40.9l-33.9 34.1H87.1zm81.7-14.2H128V112a8 8 0 00-8-8H79.1L113 70.1h81.8l33.9 34z"/></svg>`,
  json: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M128 24a104 104 0 10104 104A104.1 104.1 0 00128 24zm0 192a88 88 0 1188-88 88.1 88.1 0 01-88 88zm-32-88a32 32 0 1132 32 32 32 0 01-32-32zm48 0a16 16 0 10-16-16 16 16 0 0016 16z"/></svg>`,
  css: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M216 40H40a16 16 0 00-16 16v144a16 16 0 0016 16h176a16 16 0 0016-16V56a16 16 0 00-16-16zm0 160H40V56h176v144zm-48-80a24 24 0 01-44 14l-6.2-9.2a8 8 0 0113.3-8.9l6 8.8A8 8 0 00144 176a8 8 0 005.1-14.2L128 144a24 24 0 0113.7-44A24 24 0 01188 116a8 8 0 01-14.2 7.5A8 8 0 00168 116a8 8 0 00-5.1 14.2L184 148a24.1 24.1 0 01-16 28zm-64 24a24 24 0 01-44 14l-6.2-9.2a8 8 0 0113.3-8.9l6 8.8A8 8 0 0080 176a8 8 0 005.1-14.2L64 144a24 24 0 0113.7-44A24 24 0 01124 116a8 8 0 01-14.2 7.5A8 8 0 00104 116a8 8 0 00-5.1 14.2L120 148a24.1 24.1 0 01-16 28z"/></svg>`,
  html: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M34.7 41.7l15.9 148.8a16.2 16.2 0 0011.6 13.9L128 224l65.8-19.6a16.2 16.2 0 0011.6-13.9L221.3 41.7A16.2 16.2 0 00205.4 24H50.6a16.2 16.2 0 00-15.9 17.7zm156.4-1.4l-14.4 134.4L128 190.4l-48.7-15.7-14.4-134.4h126.2z"/></svg>`,
  png: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M216 40H40a16 16 0 00-16 16v144a16 16 0 0016 16h176a16 16 0 0016-16V56a16 16 0 00-16-16zm0 160H40V56h176v144zm-48-56a8 8 0 01-8 8h-16v16a8 8 0 01-16 0v-48a8 8 0 018-8h24a24 24 0 0124 24v8zm-16-8a8 8 0 00-8-8h-8v16h8a8 8 0 008-8zm-48-24v48a8 8 0 01-16 0v-30l-14.3 14.3a8.1 8.1 0 01-11.4 0L48 146v30a8 8 0 01-16 0v-48a8 8 0 0113.7-5.7l22.3 22.4 22.3-22.4A8 8 0 01104 112z"/></svg>`,
  jpg: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M216 40H40a16 16 0 00-16 16v144a16 16 0 0016 16h176a16 16 0 0016-16V56a16 16 0 00-16-16zm0 160H40V56h176v144zm-48-56a8 8 0 01-8 8h-16v16a8 8 0 01-16 0v-48a8 8 0 018-8h24a24 24 0 0124 24v8zm-16-8a8 8 0 00-8-8h-8v16h8a8 8 0 008-8zm-48-24v48a8 8 0 01-16 0v-30l-14.3 14.3a8.1 8.1 0 01-11.4 0L48 146v30a8 8 0 01-16 0v-48a8 8 0 0113.7-5.7l22.3 22.4 22.3-22.4A8 8 0 01104 112z"/></svg>`,
  pdf: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M216 40H40a16 16 0 00-16 16v144a16 16 0 0016 16h176a16 16 0 0016-16V56a16 16 0 00-16-16zm0 160H40V56h176v144zm-48-40a8 8 0 01-8 8h-24a8 8 0 01-8-8v-48a8 8 0 018-8h24a8 8 0 018 8zm-24-8h16v-32h-16zm-32-16a24 24 0 01-24 24h-8v16a8 8 0 01-16 0v-48a8 8 0 018-8h16a24 24 0 0124 24zm-16 0a8 8 0 00-8-8h-8v16h8a8 8 0 008-8z"/></svg>`,
  default_file: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M213.7 82.3l-56-56A8.1 8.1 0 00152 24H56a16 16 0 00-16 16v176a16 16 0 0016 16h144a16 16 0 0016-16V88a8.1 8.1 0 00-2.3-5.7zM160 51.3L188.7 80H160zM200 216H56V40h88v48a8 8 0 008 8h48v120z"/></svg>`,
  folder: `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M216 72h-85.3l-22.4-26.9A15.9 15.9 0 0096 40H40a16 16 0 00-16 16v144a16 16 0 0016 16h176a16 16 0 0016-16V88a16 16 0 00-16-16zm0 144H40V56h56l22.4 26.9A15.9 15.9 0 00130.7 88H216v128z"/></svg>`
};

const LUCIDE_ICONS = {
  md: "file-text",
  js: "file-code",
  ts: "file-code-2",
  py: "file-code",
  json: "file-json",
  css: "file-code",
  html: "file-code",
  png: "image",
  jpg: "image",
  pdf: "file-text",
  default_file: "file",
  folder: "folder"
};

const ICON_SETS = {
  material: MATERIAL_ICONS,
  vscode: VSCODE_ICONS,
  phosphor: PHOSPHOR_ICONS,
  lucide: LUCIDE_ICONS
};

const FOLDER_MAP = {
  src: "folder-src", source: "folder-src",
  assets: "folder-assets", asset: "folder-assets",
  images: "folder-images", image: "folder-images", img: "folder-images",
  docs: "folder-docs", documents: "folder-docs",
  notes: "folder-notes", note: "folder-notes",
  projects: "folder-projects", project: "folder-projects",
  templates: "folder-templates", template: "folder-templates",
  scripts: "folder-scripts", script: "folder-scripts",
  config: "folder-config", configs: "folder-config", settings: "folder-config",
  archive: "folder-archive", archives: "folder-archive",
  ".git": "folder-git", git: "folder-git"
};

function createSvgElement(svgStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgStr, "image/svg+xml");
  return doc.documentElement;
}

module.exports = class EnhanceNavigatePanePlugin extends Plugin {
	async onload() {
		this.clickHandlers = [];
		this.observers = [];
		this.collapsedStates = new Map();
		this.activeHeading = null;
		await this.loadSettings();
		this.addSettingTab(new EnhanceNavigateSettingTab(this.app, this));

		this.updateStyles();

		this.app.workspace.onLayoutReady(() => {
			this.initFilter();
			this.updateHeadings();
			this.applyIcons();
		});

		this.registerEvent(this.app.workspace.on('layout-change', () => {
			this.initFilter();
			this.updateHeadings();
			this.applyIcons();
		}));
		
		this.initIconObserver();

		this.addCommand({
			id: 'focus-enhance-navigate-pane',
			name: 'Focus Navigate Pane',
			hotkeys: [{ modifiers: ["Mod", "Alt", "Shift"], key: "ArrowLeft" }],
			callback: () => {
				if (!this.settings.focusPaneHotkey) return;
				const fileExplorerLeaf = this.app.workspace.getLeavesOfType("file-explorer")[0];
				if (fileExplorerLeaf) {
					this.app.workspace.revealLeaf(fileExplorerLeaf);
					const container = fileExplorerLeaf.view.containerEl;
					const filterInput = container.querySelector('.enhance-nav-filter-wrapper input');
					if (filterInput && this.settings.showFilter && filterInput.offsetParent !== null) {
						filterInput.focus();
					} else {
						container.focus();
					}
				}
			}
		});

		let lastShiftTime = 0;
		this.registerDomEvent(document, 'keydown', (e) => {
			if (this.settings.focusWithShift && e.code === 'ShiftLeft') {
				const now = Date.now();
				if (now - lastShiftTime < 400) {
					const filterInput = document.querySelector('.enhance-nav-filter-wrapper input');
					if (filterInput && filterInput.offsetParent !== null) {
						filterInput.focus();
					}
					lastShiftTime = 0;
				} else {
					lastShiftTime = now;
				}
			} else {
				if (e.code !== 'ShiftRight') lastShiftTime = 0; 
			}
		});

		this.registerDomEvent(document, 'click', (evt) => {
			if (!this.settings.recursiveCollapse) return;

			const folderTitle = evt.target.closest('.nav-folder-title');
			if (folderTitle && !folderTitle.classList.contains('heading-title-container') && !evt.target.closest('.enhance-nav-file-arrow')) {
				const folderContainer = folderTitle.closest('.nav-folder');
				if (folderContainer && !folderContainer.classList.contains('is-collapsed')) {
					const expandedSubFolders = folderContainer.querySelectorAll('.nav-folder:not(.is-collapsed) > .nav-folder-title');
					expandedSubFolders.forEach(title => {
						if (title !== folderTitle) {
							title.click();
						}
					});
					
					const expandedFileArrows = folderContainer.querySelectorAll('.enhance-nav-file-arrow');
					expandedFileArrows.forEach(fArrow => {
						if (fArrow.style.transform !== 'rotate(-90deg)') {
							fArrow.click();
						}
					});
				}
			}
		}, true);

		this.registerEvent(this.app.metadataCache.on('changed', (file) => {
			if (file.extension === 'md') {
				if (this.updateTimeout) clearTimeout(this.updateTimeout);
				this.updateTimeout = setTimeout(() => {
					this.updateHeadings(file.path);
				}, 500);
			}
		}));

		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file && this.activeHeading && this.activeHeading.path !== file.path) {
					this.activeHeading = null;
				}
				setTimeout(() => {
					this.updateHeadings();
				}, 100);
			})
		);
	}

	onunload() {
		this.removeFilter();
		document.querySelectorAll('.enhance-nav-headings-container').forEach(el => el.remove());
		document.querySelectorAll('.enhance-nav-file-arrow').forEach(el => el.remove());
		const styleEl = document.getElementById('enhance-nav-plugin-styles');
		if (styleEl) styleEl.remove();
	}

	initIconObserver() {
		const checkAndObserve = () => {
			const leaves = this.app.workspace.getLeavesOfType("file-explorer");
			if (leaves.length === 0) {
				setTimeout(checkAndObserve, 1000);
				return;
			}
			for (let leaf of leaves) {
				const container = leaf.view.containerEl;
				const navFilesContainer = container.querySelector('.nav-files-container');
				if (!navFilesContainer) continue;
				if (this.observers.find(o => o.container === container)) continue;
				const observer = new MutationObserver((mutations) => {
					const hasNewNodes = mutations.some(m => m.type === 'childList' && m.addedNodes.length > 0);
					if (!hasNewNodes) return;
					
					if (this.iconDebounceTimer) clearTimeout(this.iconDebounceTimer);
					this.iconDebounceTimer = setTimeout(() => this.applyIcons(), 200);
				});
				observer.observe(navFilesContainer, { childList: true, subtree: true });
				this.observers.push({ container: container, observer: observer });
			}
		};
		checkAndObserve();
	}

	applyIcons() {
		if (this.settings.iconSet === 'default') {
			document.querySelectorAll('.custom-nav-icon').forEach(el => el.remove());
			return;
		}
		
		const iconSetData = ICON_SETS[this.settings.iconSet];
		if (!iconSetData) return;

		document.querySelectorAll('.nav-file-title').forEach(el => {
			const isRenaming = el.classList.contains('is-being-renamed') || el.querySelector('input');
			const hasIcon = el.querySelector('.custom-nav-icon') !== null;
			if (isRenaming && hasIcon) return;
			
			const ext = el.getAttribute('data-path')?.split('.').pop()?.toLowerCase() || 'md';
			this.injectIcon(el, ext, iconSetData, false);
		});

		document.querySelectorAll('.nav-folder-title:not(.heading-title-container)').forEach(el => {
			const isRenaming = el.classList.contains('is-being-renamed') || el.querySelector('input');
			const hasIcon = el.querySelector('.custom-nav-icon') !== null;
			if (isRenaming && hasIcon) return;
			
			const nameEl = el.querySelector('.nav-folder-title-content');
			if (!nameEl) return;
			const name = nameEl.textContent?.trim()?.toLowerCase() || '';
			const key = FOLDER_MAP[name] || 'folder';
			this.injectIcon(el, key, iconSetData, true);
		});
	}

	injectIcon(el, key, iconSetData, isFolder) {
		let iconStr = iconSetData[key];
		if (!iconStr) {
			iconStr = isFolder ? iconSetData['folder'] : iconSetData['default_file'];
		}
		if (!iconStr) return;

		el.querySelectorAll('.custom-nav-icon').forEach(icon => icon.remove());

		const span = document.createElement('span');
		span.className = 'custom-nav-icon';
		span.style.display = 'inline-flex';
		span.style.alignItems = 'center';
		span.style.justifyContent = 'center';
		span.style.marginRight = '6px';
		span.style.width = 'var(--icon-size)';
		span.style.height = 'var(--icon-size)';
		span.style.verticalAlign = 'middle';
		span.style.opacity = '0.75';
		span.style.flexShrink = '0';

		if (this.settings.iconSet === 'lucide') {
			const { setIcon } = require('obsidian');
			setIcon(span, iconStr);
		} else {
			const svgEl = createSvgElement(iconStr);
			if (svgEl) {
				svgEl.style.width = '100%';
				svgEl.style.height = '100%';
				svgEl.style.display = 'block';
				span.appendChild(svgEl);
			}
		}
		
		const contentEl = el.querySelector('.nav-file-title-content, .nav-folder-title-content');
		if (contentEl && contentEl.parentNode) {
			contentEl.parentNode.insertBefore(span, contentEl);
		} else {
			el.prepend(span);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStyles();
		this.removeFilter();
		this.initFilter();
		this.updateHeadings();
		this.initIconObserver();
	}

	updateStyles() {
		let styleEl = document.getElementById('enhance-nav-plugin-styles');
		if (!styleEl) {
			styleEl = document.createElement('style');
			styleEl.id = 'enhance-nav-plugin-styles';
			document.head.appendChild(styleEl);
		}
		
		let css = '';
		const formatVal = (val) => val && !isNaN(val) ? val + 'px' : val;
		const pad = formatVal(this.settings.itemPadding);
		const mar = formatVal(this.settings.itemMargin);
		const ind = formatVal(this.settings.treeIndent);

		if (pad) {
			css += `.workspace-leaf-content[data-type="file-explorer"] .nav-file-title, .workspace-leaf-content[data-type="file-explorer"] .nav-folder-title { padding: ${pad} !important; }\n`;
		}
		if (mar) {
			css += `.workspace-leaf-content[data-type="file-explorer"] .nav-file-title, .workspace-leaf-content[data-type="file-explorer"] .nav-folder-title { margin: ${mar} !important; }\n`;
		}
		if (ind) {
			css += `.workspace-leaf-content[data-type="file-explorer"] .nav-folder-children { padding-left: ${ind} !important; }\n`;
		}
		
		styleEl.textContent = css;
	}

	getTreeIndent(containerEl) {
		if (this.settings.treeIndent) {
			return parseFloat(this.settings.treeIndent) || 20;
		}
		if (containerEl) {
			const folderChildren = containerEl.querySelector('.nav-folder-children');
			if (folderChildren) {
				const computed = getComputedStyle(folderChildren);
				const pl = parseFloat(computed.paddingLeft) || 0;
				const ml = parseFloat(computed.marginLeft) || 0;
				if (pl + ml > 0) return pl + ml;
			}
		}
		return 20; // default fallback if we can't measure
	}

	updateHeadings(forceUpdatePath = null, domNodes = null, targetLeaf = null) {
		if (!this.settings.showHeadings) {
			if (!domNodes) {
				document.querySelectorAll('.enhance-nav-headings-container').forEach(el => el.remove());
				document.querySelectorAll('.enhance-nav-file-arrow').forEach(el => el.remove());
			}
			return;
		}

		const formatVal = (val) => val && !isNaN(val) ? val + 'px' : val;
		const treeInd = formatVal(this.settings.treeIndent) || 'var(--nav-indentation, 20px)';
		
		const maxLevelMap = { 'H1': 1, 'H2': 2, 'H3': 3, 'H4': 4, 'H5': 5, 'H6': 6 };
		const maxLevel = maxLevelMap[this.settings.maxHeadingLevel] || 6;
		const autoExpMap = { 'Nothing': 0, 'H1': 1, 'H2': 2, 'H3': 3, 'H4': 4, 'H5': 5, 'H6': 6, 'All levels': 99 };
		const autoExpandLevel = autoExpMap[this.settings.autoExpandLevel] !== undefined ? autoExpMap[this.settings.autoExpandLevel] : 99;

		const leaves = targetLeaf ? [targetLeaf] : this.app.workspace.getLeavesOfType("file-explorer");
		for (let leaf of leaves) {
			const treeInd = this.getTreeIndent(leaf.view.containerEl);
			const halfInd = treeInd / 2;

			const fileItems = leaf.view.fileItems;
			if (!fileItems) continue;

			for (let path in fileItems) {
				const item = fileItems[path];
				if (!item.file || item.file.extension !== 'md') continue;

				if (domNodes && !domNodes.includes(item.el)) {
					continue;
				}

				const isForceUpdate = (forceUpdatePath === path);
				const hasHeadings = item.el.querySelector('.enhance-nav-headings-container') !== null;

				if (hasHeadings && !isForceUpdate && !domNodes) {
					continue;
				}

				// Clean up old headings
				const oldHeadings = item.el.querySelectorAll('.enhance-nav-headings-container');
				oldHeadings.forEach(el => el.remove());

				const oldArrows = item.el.querySelectorAll('.enhance-nav-file-arrow');
				oldArrows.forEach(el => el.remove());

				const cache = this.app.metadataCache.getFileCache(item.file);
				let container = null;
				
				if (!cache || !cache.headings || cache.headings.length === 0) {
					continue;
				}

				const filteredHeadings = cache.headings.filter(h => h.level <= maxLevel);
				if (filteredHeadings.length === 0) {
					if (container) container.remove();
					const existingArrow = item.el.querySelector('.enhance-nav-file-arrow');
					if (existingArrow) existingArrow.remove();
					continue;
				}

				const headingsStr = JSON.stringify(filteredHeadings.map(h => h.heading + h.level));
				const titleEl = item.el.querySelector('.nav-file-title');

				if (!container) {
					container = document.createElement('div');
					container.className = 'enhance-nav-headings-container';
					
					const paddingLeftStr = titleEl ? getComputedStyle(titleEl).paddingLeft : '24px';
					let paddingLeft = parseFloat(paddingLeftStr) || 24;
					if (paddingLeft === 0 && titleEl && titleEl.style.paddingLeft) paddingLeft = parseFloat(titleEl.style.paddingLeft) || 24;

					container.style.marginLeft = (paddingLeft - 12) + 'px';
					container.style.borderLeft = '1px solid var(--nav-indentation-guide-color)';
					container.style.paddingLeft = '36px';
					
					if (titleEl) {
						titleEl.insertAdjacentElement('afterend', container);
					} else {
						item.el.appendChild(container);
					}
				}

				const rootStateKey = `${item.file.path}:root`;
				let rootCollapsed = this.collapsedStates.get(rootStateKey);
				if (rootCollapsed === undefined) {
					rootCollapsed = autoExpandLevel === 0;
					this.collapsedStates.set(rootStateKey, rootCollapsed);
				}
				if (titleEl) {
					let fileArrow = item.el.querySelector('.enhance-nav-file-arrow');
					
					titleEl.style.setProperty('position', 'relative', 'important');
					titleEl.style.setProperty('overflow', 'visible', 'important');
					
					if (!fileArrow) {
						fileArrow = document.createElement('div');
						fileArrow.className = 'enhance-nav-file-arrow';
						fileArrow.style.setProperty('top', '0', 'important');
						fileArrow.style.setProperty('bottom', '0', 'important');
						fileArrow.style.setProperty('display', 'flex', 'important');
						fileArrow.style.setProperty('align-items', 'center', 'important');
						fileArrow.style.setProperty('justify-content', 'center', 'important');
						fileArrow.style.setProperty('transition', 'transform 0.1s ease', 'important');
						fileArrow.style.setProperty('color', 'var(--text-muted)', 'important');
						fileArrow.style.setProperty('opacity', '1', 'important');
						fileArrow.style.setProperty('z-index', '10', 'important');
						fileArrow.style.setProperty('cursor', 'pointer', 'important');
						fileArrow.style.setProperty('flex-shrink', '0', 'important');
						
						fileArrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle" style="width: 12px; height: 12px;"><path d="M3 8L12 17L21 8"></path></svg>`;
						
						fileArrow.addEventListener('mouseenter', () => fileArrow.style.setProperty('color', 'var(--text-normal)', 'important'));
						fileArrow.addEventListener('mouseleave', () => fileArrow.style.setProperty('color', 'var(--text-muted)', 'important'));
						
						fileArrow.addEventListener('click', (e) => {
							e.stopPropagation();
							const currentlyCollapsed = container.style.display === 'none';
							const willCollapse = !currentlyCollapsed;
							this.collapsedStates.set(rootStateKey, willCollapse);
							
							if (willCollapse) {
								container.style.display = 'none';
								fileArrow.style.transform = 'rotate(-90deg)';
							} else {
								container.style.display = '';
								fileArrow.style.transform = '';
								
								if (this.settings.arrowExpands === 'All levels') {
									const childItems = container.querySelectorAll('.heading-item.is-collapsed');
									childItems.forEach(child => {
										const key = child.dataset.stateKey;
										if (key) this.collapsedStates.set(key, false);
										child.classList.remove('is-collapsed');
										const childArrow = child.querySelector('.enhance-nav-collapse-icon');
										if (childArrow) childArrow.style.transform = '';
										const childChildren = child.querySelector('.heading-children');
										if (childChildren) childChildren.style.display = '';
									});
								}
							}
						});
						
						titleEl.insertBefore(fileArrow, titleEl.firstChild);
					}
					
					fileArrow.style.setProperty('width', '24px', 'important');
					fileArrow.style.setProperty('position', 'absolute', 'important');
					fileArrow.style.setProperty('margin-left', '-24px', 'important');
					fileArrow.style.removeProperty('left');
					fileArrow.style.removeProperty('margin-right');
					
					if (rootCollapsed) {
						container.style.display = 'none';
						fileArrow.style.transform = 'rotate(-90deg)';
					} else {
						container.style.display = '';
						fileArrow.style.transform = '';
					}
				}

				if (container.dataset.headings === headingsStr) {
					continue;
				}
				container.dataset.headings = headingsStr;
				container.innerHTML = '';

				const stack = [ { level: 0, container: container } ];

				filteredHeadings.forEach((h, index) => {
					while (stack.length > 1 && stack[stack.length - 1].level >= h.level) {
						stack.pop();
					}
					const parent = stack[stack.length - 1];

					const itemContainer = document.createElement('div');
					itemContainer.className = 'heading-item';
					
					const titleContainer = document.createElement('div');
					titleContainer.className = 'heading-title-container';
					titleContainer.style.borderRadius = 'var(--radius-s)';
					
					if (this.activeHeading && this.activeHeading.path === item.file.path && this.activeHeading.line === h.position.start.line) {
						titleContainer.classList.add('is-active');
						titleContainer.style.backgroundColor = 'var(--nav-item-background-active, var(--background-modifier-active-hover))';
						titleContainer.style.color = 'var(--text-normal)';
					}
					titleContainer.style.display = 'flex';
					titleContainer.style.alignItems = 'center';
					titleContainer.style.cursor = 'pointer';
					titleContainer.style.padding = '3px 0';
					titleContainer.style.color = 'var(--text-muted)';
					titleContainer.style.transition = 'color 0.15s ease';
					titleContainer.style.fontSize = 'var(--nav-item-size)';
					titleContainer.style.setProperty('position', 'relative', 'important');
					titleContainer.style.marginLeft = '0px';
					titleContainer.style.setProperty('overflow', 'visible', 'important');
					
					const hasChildren = index < filteredHeadings.length - 1 && filteredHeadings[index + 1].level > h.level;
					
					const arrowEl = document.createElement('div');
					arrowEl.className = 'enhance-nav-collapse-icon';
					arrowEl.style.setProperty('position', 'absolute', 'important');
					arrowEl.style.setProperty('left', '-24px', 'important');
					arrowEl.style.setProperty('width', '24px', 'important');
					arrowEl.style.setProperty('top', '0', 'important');
					arrowEl.style.setProperty('bottom', '0', 'important');
					arrowEl.style.setProperty('margin', '0px', 'important');
					arrowEl.style.setProperty('padding', '0px', 'important');
					arrowEl.style.setProperty('display', 'flex', 'important');
					arrowEl.style.setProperty('align-items', 'center', 'important');
					arrowEl.style.setProperty('justify-content', 'center', 'important');
					arrowEl.style.transition = 'transform 0.1s ease';
					arrowEl.style.setProperty('color', 'var(--text-muted)', 'important');
					arrowEl.style.setProperty('opacity', '1', 'important');
					arrowEl.style.setProperty('z-index', '10', 'important');
					
					if (!hasChildren) {
						arrowEl.style.setProperty('visibility', 'hidden', 'important');
					} else {
						arrowEl.style.setProperty('visibility', 'visible', 'important');
						arrowEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle" style="width: 12px; height: 12px;"><path d="M3 8L12 17L21 8"></path></svg>`;
						arrowEl.addEventListener('mouseenter', () => arrowEl.style.setProperty('color', 'var(--text-normal)', 'important'));
						arrowEl.addEventListener('mouseleave', () => arrowEl.style.setProperty('color', 'var(--text-muted)', 'important'));
					}
					titleContainer.appendChild(arrowEl);
					
					const hIcon = document.createElement('div');
					hIcon.textContent = 'H' + h.level;
					hIcon.style.fontSize = '11px';
					hIcon.style.opacity = Math.max(0.4, 1 - ((h.level - 1) * 0.15)).toString();
					hIcon.style.marginRight = '6px';
					hIcon.style.fontWeight = 'bold';
					hIcon.style.width = 'var(--icon-size)';
					hIcon.style.height = 'var(--icon-size)';
					hIcon.style.display = 'flex';
					hIcon.style.alignItems = 'center';
					hIcon.style.justifyContent = 'center';
					hIcon.style.flexShrink = '0';
					titleContainer.appendChild(hIcon);
					
					const text = document.createElement('span');
					text.className = 'heading-title-content';
					text.textContent = h.heading;
					text.style.whiteSpace = 'nowrap';
					text.style.overflow = 'hidden';
					text.style.textOverflow = 'ellipsis';
					titleContainer.appendChild(text);
					
					itemContainer.appendChild(titleContainer);
					parent.container.appendChild(itemContainer);
					
					let childrenContainer = null;
					if (hasChildren) {
						childrenContainer = document.createElement('div');
						childrenContainer.className = 'heading-children';
						childrenContainer.style.marginLeft = '-12px'; 
						childrenContainer.style.borderLeft = '1px solid var(--nav-indentation-guide-color)';
						childrenContainer.style.paddingLeft = '36px';
						
						const stateKey = `${item.file.path}:${index}`;
						let isCollapsed = this.collapsedStates.get(stateKey);
						if (isCollapsed === undefined) {
							isCollapsed = h.level >= autoExpandLevel;
							this.collapsedStates.set(stateKey, isCollapsed);
						}
						
						if (isCollapsed) {
							itemContainer.classList.add('is-collapsed');
							childrenContainer.style.display = 'none';
							arrowEl.style.transform = 'rotate(-90deg)';
						}
						
						itemContainer.appendChild(childrenContainer);
						itemContainer.dataset.stateKey = stateKey;
						stack.push({ level: h.level, container: childrenContainer, itemContainer, stateKey });
					}
					
					titleContainer.addEventListener('mouseenter', () => {
						if (!(this.activeHeading && this.activeHeading.path === item.file.path && this.activeHeading.line === h.position.start.line)) {
							titleContainer.style.color = 'var(--text-normal)';
							titleContainer.style.backgroundColor = 'var(--nav-item-background-hover)';
						}
					});
					titleContainer.addEventListener('mouseleave', () => {
						if (!(this.activeHeading && this.activeHeading.path === item.file.path && this.activeHeading.line === h.position.start.line)) {
							titleContainer.style.color = 'var(--text-muted)';
							titleContainer.style.backgroundColor = 'transparent';
						}
					});
					
					titleContainer.addEventListener('click', async (e) => {
						e.stopPropagation();
						
						this.activeHeading = {
							path: item.file.path,
							line: h.position.start.line
						};
						
						const leafToUse = this.app.workspace.getLeaf(false);
						await leafToUse.openFile(item.file, { eState: { line: h.position.start.line } });
						
						this.updateHeadings();
					});
					
					arrowEl.addEventListener('click', (e) => {
						e.stopPropagation();
						if (!hasChildren) return;
						
						const stateKey = `${item.file.path}:${index}`;
						const currentlyCollapsed = itemContainer.classList.contains('is-collapsed');
						const willCollapse = !currentlyCollapsed;
						
						this.collapsedStates.set(stateKey, willCollapse);
						
						if (willCollapse) {
							itemContainer.classList.add('is-collapsed');
							childrenContainer.style.display = 'none';
							arrowEl.style.transform = 'rotate(-90deg)';
							
							if (this.settings.recursiveCollapse) {
								const childItems = childrenContainer.querySelectorAll('.heading-item:not(.is-collapsed)');
								childItems.forEach(child => {
									const key = child.dataset.stateKey;
									if (key) this.collapsedStates.set(key, true);
									child.classList.add('is-collapsed');
									const childArrow = child.querySelector('.enhance-nav-collapse-icon');
									if (childArrow) childArrow.style.transform = 'rotate(-90deg)';
									const childChildren = child.querySelector('.heading-children');
									if (childChildren) childChildren.style.display = 'none';
								});
							}
						} else {
							itemContainer.classList.remove('is-collapsed');
							childrenContainer.style.display = '';
							arrowEl.style.transform = '';
							
							if (this.settings.arrowExpands === 'All levels') {
								const childItems = childrenContainer.querySelectorAll('.heading-item.is-collapsed');
								childItems.forEach(child => {
									const key = child.dataset.stateKey;
									if (key) this.collapsedStates.set(key, false);
									child.classList.remove('is-collapsed');
									const childArrow = child.querySelector('.enhance-nav-collapse-icon');
									if (childArrow) childArrow.style.transform = '';
									const childChildren = child.querySelector('.heading-children');
									if (childChildren) childChildren.style.display = '';
								});
							}
						}
					});
				});
			}
		}
	}



	removeFilter() {
		const leaves = this.app.workspace.getLeavesOfType("file-explorer");
		for (let leaf of leaves) {
			const container = leaf.view.containerEl;
			
			const existingInputs = container.querySelectorAll('.enhance-nav-filter-container, .enhance-nav-filter-wrapper, .enhance-nav-custom-results');
			existingInputs.forEach(el => el.remove());
			
			const navFilesContainer = container.querySelector('.nav-files-container');
			if (navFilesContainer) {
				navFilesContainer.style.display = '';
			}
			
			const handlerObj = this.clickHandlers.find(h => h.container === container);
			if (handlerObj) {
				container.removeEventListener('click', handlerObj.handler, true);
				this.clickHandlers = this.clickHandlers.filter(h => h.container !== container);
			}

			const obsObj = this.observers.find(o => o.container === container);
			if (obsObj) {
				obsObj.observer.disconnect();
				this.observers = this.observers.filter(o => o.container !== container);
			}

			container.style.removeProperty('--nav-item-size');
			
			if (leaf.view.fileItems) {
				for (let path in leaf.view.fileItems) {
					const item = leaf.view.fileItems[path];
					if (item.el) {
						item.el.style.display = '';
					}
					if (item.titleEl) {
						item.titleEl.style.backgroundColor = '';
					}
				}
			}
		}
	}

	initFilter() {
		const leaves = this.app.workspace.getLeavesOfType("file-explorer");
		for (let leaf of leaves) {
			const container = leaf.view.containerEl;
			const navHeader = container.querySelector('.nav-header');
			const navFilesContainer = container.querySelector('.nav-files-container');
			if (!navHeader || !navFilesContainer) continue;

			if (container.querySelector('.enhance-nav-filter-wrapper')) continue;

			if (this.settings.fontSize) {
				const fs = !isNaN(this.settings.fontSize) ? this.settings.fontSize + 'px' : this.settings.fontSize;
				container.style.setProperty('--nav-item-size', fs);
			}

			let currentEl = null;
			let originalCollapsedStates = null;

			const updateHighlight = () => {
				const activeContainer = inputEl.value ? customContainer : navFilesContainer;
				if (activeContainer) {
					activeContainer.querySelectorAll('.nav-file-title, .nav-folder-title, .heading-title-container').forEach(el => {
						el.style.backgroundColor = '';
					});
				}
				if (currentEl && currentEl.offsetParent !== null) {
					currentEl.style.backgroundColor = 'var(--background-modifier-hover)';
					currentEl.scrollIntoView({ block: 'nearest' });
				}
			};

			const clickHandler = (e) => {
				const titleEl = e.target.closest('.nav-file-title, .nav-folder-title');
				if (titleEl) {
					currentEl = titleEl;
					updateHighlight();

					if (!titleEl.classList.contains('heading-title-container')) {
						this.activeHeading = null;
					}

					if (this.settings.interceptClick && titleEl.classList.contains('nav-file-title')) {
						if (e.detail < 2) {
							e.stopPropagation();
							e.preventDefault();
						}
					}
				}
			};

			container.addEventListener('click', clickHandler, true);
			this.clickHandlers.push({ container, handler: clickHandler });

			if (!this.settings.showFilter) continue;

			const filterContainer = document.createElement('div');
			filterContainer.className = 'enhance-nav-filter-wrapper';
			filterContainer.style.padding = '4px 12px 8px 12px';
			filterContainer.style.display = 'flex';
			filterContainer.style.alignItems = 'center';
			filterContainer.style.gap = '8px';

			const headingToggle = document.createElement('div');
			headingToggle.className = 'clickable-icon';
			headingToggle.title = 'Toggle Search Headings';
			headingToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>`;
			headingToggle.style.display = 'flex';
			headingToggle.style.alignItems = 'center';
			headingToggle.style.justifyContent = 'center';
			headingToggle.style.color = this.settings.searchHeadings ? 'var(--interactive-accent)' : 'var(--text-muted)';
			
			headingToggle.addEventListener('click', async () => {
				this.settings.searchHeadings = !this.settings.searchHeadings;
				headingToggle.style.color = this.settings.searchHeadings ? 'var(--interactive-accent)' : 'var(--text-muted)';
				inputEl.placeholder = this.settings.searchHeadings ? 'Filter files & headings...' : 'Filter files...';
				await this.saveData(this.settings);
				applyFilter();
			});

			const searchContainer = document.createElement('div');
			searchContainer.className = 'search-input-container';
			searchContainer.style.flexGrow = '1';

			const inputEl = document.createElement('input');
			inputEl.type = 'search';
			inputEl.placeholder = this.settings.searchHeadings ? 'Filter files & headings...' : 'Filter files...';
			inputEl.style.width = '100%';
			
			const clearBtn = document.createElement('div');
			clearBtn.className = 'search-input-clear-button';
			clearBtn.setAttribute('aria-label', 'Clear search');
			clearBtn.style.display = 'none';

			searchContainer.appendChild(inputEl);
			searchContainer.appendChild(clearBtn);

			filterContainer.appendChild(headingToggle);
			filterContainer.appendChild(searchContainer);
			navHeader.parentNode.insertBefore(filterContainer, navHeader.nextSibling);

			let customContainer = container.querySelector('.enhance-nav-custom-results');
			if (!customContainer) {
				customContainer = document.createElement('div');
				customContainer.className = 'enhance-nav-custom-results';
				customContainer.style.display = 'none';
				customContainer.style.padding = '0 8px';
				customContainer.style.overflowY = 'auto';
				customContainer.style.overflowX = 'hidden';
				customContainer.style.flex = '1';
				customContainer.style.height = '100%';
				navFilesContainer.parentNode.insertBefore(customContainer, navFilesContainer.nextSibling);
			}

			const applyTextHighlight = (el, textContent, q) => {
				el.innerHTML = '';
				const terms = q.split('|').map(t => t.trim()).filter(t => t.length > 0);
				if (terms.length === 0) {
					el.textContent = textContent;
					return;
				}

				const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
				const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
				
				let lastIndex = 0;
				let match;
				while ((match = regex.exec(textContent)) !== null) {
					if (match.index > lastIndex) {
						el.appendChild(document.createTextNode(textContent.substring(lastIndex, match.index)));
					}
					const mark = document.createElement('span');
					mark.className = 'suggestion-highlight';
					mark.style.backgroundColor = '#fde047'; // Soft yellow
					mark.style.color = '#000000'; // Black text for high contrast
					mark.style.padding = '0 2px';
					mark.style.borderRadius = '3px';
					mark.textContent = match[0];
					el.appendChild(mark);
					lastIndex = regex.lastIndex;
				}
				if (lastIndex < textContent.length) {
					el.appendChild(document.createTextNode(textContent.substring(lastIndex)));
				}
			};

			const applyFilter = () => {
				const q = inputEl.value.toLowerCase();
				const terms = q.split('|').map(t => t.trim()).filter(t => t.length > 0);
				clearBtn.style.display = q ? '' : 'none';
				
				if (terms.length === 0) {
					customContainer.style.display = 'none';
					customContainer.innerHTML = '';
					navFilesContainer.style.display = '';
					// Ensure native headings are up to date
					setTimeout(() => this.updateHeadings(), 50);
					return;
				}

				navFilesContainer.style.display = 'none';
				customContainer.style.display = '';
				customContainer.innerHTML = '';

				const fileItems = leaf.view.fileItems;
				if (!fileItems) return;
				
				const treeInd = this.getTreeIndent(container);
				const halfInd = treeInd / 2;

				let visiblePaths = new Set();
				let matchedFiles = new Map();
				let matchedFolders = new Set();

				const files = this.app.vault.getFiles();
				const maxLevel = this.settings.maxHeadingLevel === 'All' ? 6 : parseInt(this.settings.maxHeadingLevel.replace('H', ''));

				for (let file of files) {
					const fileNameLower = file.name.toLowerCase();
					let fileMatched = terms.some(t => fileNameLower.includes(t));
					let matchedHeadings = [];

					if (this.settings.searchHeadings && file.extension === 'md') {
						const cache = this.app.metadataCache.getFileCache(file);
						if (cache && cache.headings) {
							const allHeadings = cache.headings.filter(h => h.level <= maxLevel);
							let matchedIndices = new Set();
							
							for (let i = 0; i < allHeadings.length; i++) {
								const headingLower = allHeadings[i].heading.toLowerCase();
								if (terms.some(t => headingLower.includes(t))) {
									matchedIndices.add(i);
									let currentLevel = allHeadings[i].level;
									for (let j = i - 1; j >= 0; j--) {
										if (allHeadings[j].level < currentLevel) {
											matchedIndices.add(j);
											currentLevel = allHeadings[j].level;
										}
										if (currentLevel === 1) break;
									}
								}
							}
							
							matchedHeadings = allHeadings.filter((h, i) => matchedIndices.has(i));
						}
					}

					let folderMatched = false;
					let parent = file.parent;
					while (parent && parent.path !== '/') {
						const parentNameLower = parent.name.toLowerCase();
						if (terms.some(t => parentNameLower.includes(t))) {
							folderMatched = true;
							matchedFolders.add(parent.path);
						}
						parent = parent.parent;
					}

					if (fileMatched || matchedHeadings.length > 0 || folderMatched) {
						visiblePaths.add(file.path);
						matchedFiles.set(file.path, { fileMatched, matchedHeadings });
						
						let p = file.parent;
						while (p && p.path !== '/') {
							visiblePaths.add(p.path);
							p = p.parent;
						}
					}
				}

				let clonedNodes = new Map();

				for (let path in fileItems) {
					if (!visiblePaths.has(path)) continue;

					const item = fileItems[path];
					if (!item.el) continue;

					const clone = item.el.cloneNode(true);
					clone.style.position = '';
					clone.style.transform = '';
					clone.style.top = '';
					clone.style.height = '';
					clone.style.width = '';
					clone.style.display = '';
					clone.classList.remove('is-hidden-by-filter');
					clone.classList.remove('is-collapsed');

					// Clean up native children and native headings to prevent duplication
					const nativeChildren = clone.querySelector('.nav-folder-children');
					if (nativeChildren) {
						nativeChildren.innerHTML = '';
					}
					const nativeHeadings = clone.querySelectorAll('.enhance-nav-headings-container');
					nativeHeadings.forEach(el => el.remove());

					const titleEl = clone.querySelector('.nav-file-title, .nav-folder-title');
					if (titleEl) {
						const isFolder = !item.file || !item.file.extension;
						const contentEl = titleEl.querySelector(isFolder ? '.nav-folder-title-content' : '.nav-file-title-content');
						
						if (contentEl && item.file) {
							const realText = isFolder ? item.file.name : item.file.basename;
							
							if (!isFolder && matchedFiles.has(path) && matchedFiles.get(path).fileMatched) {
								applyTextHighlight(contentEl, realText, q);
							} else if (isFolder && matchedFolders.has(path)) {
								applyTextHighlight(contentEl, realText, q);
							} else {
								contentEl.textContent = realText;
							}
						}

						titleEl.addEventListener('click', async (e) => {
							e.stopPropagation();
							e.preventDefault();

							const indexPath = [];
							let current = e.target;
							while (current && current !== clone) {
								let index = Array.prototype.indexOf.call(current.parentNode.childNodes, current);
								indexPath.unshift(index);
								current = current.parentNode;
							}
							
							let nativeTarget = item.el;
							for (let index of indexPath) {
								if (nativeTarget.childNodes && nativeTarget.childNodes[index]) {
									nativeTarget = nativeTarget.childNodes[index];
								} else {
									nativeTarget = null;
									break;
								}
							}
							
							if (nativeTarget) {
								const clickEvent = new MouseEvent('click', {
									bubbles: true,
									cancelable: true,
									view: window,
									clientX: e.clientX,
									clientY: e.clientY
								});
								nativeTarget.dispatchEvent(clickEvent);
							}

							if (item.file.extension && (e.target.closest('.nav-file-title-content') || e.target === titleEl)) {
								if (this.settings.interceptClick) {
									if (e.detail < 2) return;
								}
								await this.app.workspace.getLeaf(false).openFile(item.file);
							}
						});
					}

					if (matchedFiles.has(path)) {
						const matchData = matchedFiles.get(path);
						if (matchData.matchedHeadings && matchData.matchedHeadings.length > 0) {
							const headingsContainer = document.createElement('div');
							headingsContainer.className = 'enhance-nav-headings-container heading-children';
							
							const paddingLeftStr = titleEl ? getComputedStyle(titleEl).paddingLeft : '24px';
							let paddingLeft = parseFloat(paddingLeftStr) || 24;
							if (paddingLeft === 0 && titleEl && titleEl.style.paddingLeft) paddingLeft = parseFloat(titleEl.style.paddingLeft) || 24;

							headingsContainer.style.marginLeft = (paddingLeft - 12) + 'px';
							headingsContainer.style.borderLeft = '1px solid var(--nav-indentation-guide-color)';
							headingsContainer.style.paddingLeft = '36px';

							const stack = [ { level: 0, container: headingsContainer } ];

							matchData.matchedHeadings.forEach((h, index) => {
								while (stack.length > 1 && stack[stack.length - 1].level >= h.level) {
									stack.pop();
								}
								const parent = stack[stack.length - 1];

								const hItem = document.createElement('div');
								hItem.className = 'heading-item';

								const titleContainer = document.createElement('div');
								titleContainer.className = 'heading-title-container';
								titleContainer.style.borderRadius = 'var(--radius-s)';
								titleContainer.style.display = 'flex';
								titleContainer.style.alignItems = 'center';
								titleContainer.style.cursor = 'pointer';
								titleContainer.style.padding = '3px 0';
								titleContainer.style.color = 'var(--text-muted)';
								titleContainer.style.transition = 'color 0.15s ease';
								titleContainer.style.fontSize = 'var(--nav-item-size)';
								titleContainer.style.setProperty('position', 'relative', 'important');
								titleContainer.style.marginLeft = '0px';
								titleContainer.style.setProperty('overflow', 'visible', 'important');
								
								const hasChildren = index < matchData.matchedHeadings.length - 1 && matchData.matchedHeadings[index + 1].level > h.level;
								
								const arrowEl = document.createElement('div');
								arrowEl.className = 'enhance-nav-collapse-icon';
								arrowEl.style.setProperty('position', 'absolute', 'important');
								arrowEl.style.setProperty('left', '-24px', 'important');
								arrowEl.style.setProperty('width', '24px', 'important');
								arrowEl.style.setProperty('top', '0', 'important');
								arrowEl.style.setProperty('bottom', '0', 'important');
								arrowEl.style.setProperty('margin', '0px', 'important');
								arrowEl.style.setProperty('padding', '0px', 'important');
								arrowEl.style.setProperty('display', 'flex', 'important');
								arrowEl.style.setProperty('align-items', 'center', 'important');
								arrowEl.style.setProperty('justify-content', 'center', 'important');
								arrowEl.style.transition = 'transform 0.1s ease';
								arrowEl.style.setProperty('color', 'var(--text-muted)', 'important');
								arrowEl.style.setProperty('opacity', '1', 'important');
								arrowEl.style.setProperty('z-index', '10', 'important');
								
								if (!hasChildren) {
									arrowEl.style.setProperty('visibility', 'hidden', 'important');
								} else {
									arrowEl.style.setProperty('visibility', 'visible', 'important');
									arrowEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle" style="width: 12px; height: 12px;"><path d="M3 8L12 17L21 8"></path></svg>`;
									arrowEl.addEventListener('mouseenter', () => arrowEl.style.setProperty('color', 'var(--text-normal)', 'important'));
									arrowEl.addEventListener('mouseleave', () => arrowEl.style.setProperty('color', 'var(--text-muted)', 'important'));
								}
								titleContainer.appendChild(arrowEl);
								
								const hIcon = document.createElement('div');
								hIcon.textContent = 'H' + h.level;
								hIcon.style.fontSize = '11px';
								hIcon.style.opacity = Math.max(0.4, 1 - ((h.level - 1) * 0.15)).toString();
								hIcon.style.marginRight = '6px';
								hIcon.style.fontWeight = 'bold';
								hIcon.style.width = 'var(--icon-size)';
								hIcon.style.height = 'var(--icon-size)';
								hIcon.style.display = 'flex';
								hIcon.style.alignItems = 'center';
								hIcon.style.justifyContent = 'center';
								hIcon.style.flexShrink = '0';
								
								const hContent = document.createElement('span');
								hContent.style.whiteSpace = 'nowrap';
								hContent.style.overflow = 'hidden';
								hContent.style.textOverflow = 'ellipsis';
								applyTextHighlight(hContent, h.heading, q);

								titleContainer.appendChild(hIcon);
								titleContainer.appendChild(hContent);

								titleContainer.addEventListener('mouseenter', () => {
									if (!titleContainer.classList.contains('is-active')) {
										titleContainer.style.backgroundColor = 'var(--nav-item-background-hover)';
									}
								});
								titleContainer.addEventListener('mouseleave', () => {
									if (!titleContainer.classList.contains('is-active')) {
										titleContainer.style.backgroundColor = 'transparent';
									}
								});

								titleContainer.addEventListener('click', async (e) => {
									e.stopPropagation();
									const leafObj = this.app.workspace.getLeaf(false);
									await leafObj.openFile(item.file);
									
									setTimeout(() => {
										const view = leafObj.view;
										if (view && view.editor) {
											const pos = { line: h.position.start.line, ch: 0 };
											view.editor.setCursor(pos);
											view.editor.scrollIntoView({from: pos, to: pos}, true);
										}
									}, 100);
								});

								titleContainer.addEventListener('mouseenter', () => titleContainer.style.color = 'var(--text-normal)');
								titleContainer.addEventListener('mouseleave', () => titleContainer.style.color = 'var(--text-muted)');

								hItem.appendChild(titleContainer);
								
								if (hasChildren) {
									const childrenContainer = document.createElement('div');
									childrenContainer.className = 'heading-children';
									childrenContainer.style.marginLeft = '-12px';
									childrenContainer.style.borderLeft = '1px solid var(--nav-indentation-guide-color)';
									childrenContainer.style.paddingLeft = '36px';
									
									hItem.appendChild(childrenContainer);
									stack.push({ level: h.level, container: childrenContainer });
									
									arrowEl.addEventListener('click', (e) => {
										e.stopPropagation();
										if (childrenContainer.style.display === 'none') {
											childrenContainer.style.display = '';
											arrowEl.style.transform = '';
											hItem.classList.remove('is-collapsed');
										} else {
											childrenContainer.style.display = 'none';
											arrowEl.style.transform = 'rotate(-90deg)';
											hItem.classList.add('is-collapsed');
											
											if (this.settings.recursiveCollapse) {
												const childItems = childrenContainer.querySelectorAll('.heading-item:not(.is-collapsed)');
												childItems.forEach(child => {
													child.classList.add('is-collapsed');
													const childArrow = child.querySelector('.collapse-icon');
													if (childArrow) childArrow.style.transform = 'rotate(-90deg)';
													const childChildren = child.querySelector('.heading-children');
													if (childChildren) childChildren.style.display = 'none';
												});
											}
										}
									});
								}
								
								parent.container.appendChild(hItem);
							});

							clone.appendChild(headingsContainer);
						}
					}

					clonedNodes.set(path, clone);
				}

				for (let path in fileItems) {
					if (!clonedNodes.has(path)) continue;
					const clone = clonedNodes.get(path);
					const item = fileItems[path];
					const parentPath = item.file.parent ? item.file.parent.path : null;

					if (parentPath && parentPath !== '/' && clonedNodes.has(parentPath)) {
						const parentClone = clonedNodes.get(parentPath);
						let childrenContainer = parentClone.querySelector('.nav-folder-children');
						if (!childrenContainer) {
							childrenContainer = document.createElement('div');
							childrenContainer.className = 'nav-folder-children';
							parentClone.appendChild(childrenContainer);
						}
						childrenContainer.appendChild(clone);
					} else {
						customContainer.appendChild(clone);
					}
				}
				this.applyIcons();
				
				if (q) {
					const visibleTitles = Array.from(customContainer.querySelectorAll('.nav-file-title, .nav-folder-title, .heading-title-container'))
						.filter(el => el.offsetParent !== null);
					if (visibleTitles.length > 0) {
						currentEl = visibleTitles[0];
					} else {
						currentEl = null;
					}
					updateHighlight();
				}
			};

			inputEl.addEventListener('input', applyFilter);

			clearBtn.addEventListener('click', () => {
				inputEl.value = '';
				applyFilter();
				inputEl.focus();
			});

			container.addEventListener('keydown', (e) => {
				const activeContainer = inputEl.value ? customContainer : navFilesContainer;
				if (!activeContainer) return;
				
				const visibleTitles = Array.from(activeContainer.querySelectorAll('.nav-file-title, .nav-folder-title, .heading-title-container'))
					.filter(el => el.offsetParent !== null);
					
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					let idx = visibleTitles.indexOf(currentEl);
					if (idx < visibleTitles.length - 1) {
						currentEl = visibleTitles[idx + 1];
						updateHighlight();
					}
				} else if (e.key === 'ArrowUp') {
					e.preventDefault();
					let idx = visibleTitles.indexOf(currentEl);
					if (idx > 0) {
						currentEl = visibleTitles[idx - 1];
						updateHighlight();
					} else if (idx === -1 && visibleTitles.length > 0) {
						currentEl = visibleTitles[0];
						updateHighlight();
					}
				} else if (e.key === 'Escape') {
					if (inputEl.value) {
						e.preventDefault();
						inputEl.value = '';
						applyFilter();
					}
				} else if (e.key === 'Enter') {
					if (currentEl) {
						e.preventDefault();
						const prevIntercept = this.settings.interceptClick;
						this.settings.interceptClick = false;
						currentEl.click(); 
						this.settings.interceptClick = prevIntercept;
					}
				}
			});
		}
	}
}

class EnhanceNavigateSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const {containerEl} = this;
		containerEl.empty();
		containerEl.createEl('h2', {text: 'Enhance Navigate Pane Settings'});

		new Setting(containerEl).setHeading().setName('General');

		new Setting(containerEl)
			.setName('Enable Filter Textbox')
			.setDesc('Show a textbox at the top of the file explorer to filter files and folders.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showFilter)
				.onChange(async (value) => {
					this.plugin.settings.showFilter = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Double Left-Shift to Filter')
			.setDesc('Press Left-Shift twice quickly to automatically focus the filter textbox.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.focusWithShift)
				.onChange(async (value) => {
					this.plugin.settings.focusWithShift = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Ctrl+Alt+Shift+Left to Focus Pane')
			.setDesc('Press Ctrl + Alt + Shift + Left Arrow to quickly focus the navigation pane from the editor.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.focusPaneHotkey)
				.onChange(async (value) => {
					this.plugin.settings.focusPaneHotkey = value;
					await this.plugin.saveSettings();
				}));
				
		new Setting(containerEl)
			.setName('Recursive Collapse')
			.setDesc('When collapsing a folder, file, or heading, automatically collapse all its nested items as well.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.recursiveCollapse)
				.onChange(async (value) => {
					this.plugin.settings.recursiveCollapse = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Intercept Mouse Click')
			.setDesc('When clicking a file, only highlight it instead of opening it. You can double-click or press Enter to open.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.interceptClick)
				.onChange(async (value) => {
					this.plugin.settings.interceptClick = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setHeading().setName('Appearance');

		new Setting(containerEl)
			.setName('Icon Set')
			.setDesc('Choose an icon set for files and folders in the navigation pane.')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'default': 'Obsidian Default (None)',
					'material': 'Material Icons',
					'vscode': 'VSCode Icons',
					'phosphor': 'Phosphor Icons',
					'lucide': 'Lucide Icons'
				})
				.setValue(this.plugin.settings.iconSet)
				.onChange(async (value) => {
					this.plugin.settings.iconSet = value;
					await this.plugin.saveSettings();
					
					document.querySelectorAll('.custom-nav-icon').forEach(el => el.remove());
					this.plugin.applyIcons();
				}));

		new Setting(containerEl)
			.setName('Font Size')
			.setDesc('Adjust the font size of the navigate pane (e.g., 14, 16). Leave blank for default.')
			.addText(text => text
				.setPlaceholder('14')
				.setValue(this.plugin.settings.fontSize)
				.onChange(async (value) => {
					this.plugin.settings.fontSize = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Item Padding')
			.setDesc('Adjust padding around the file/folder items (e.g., 4px 8px). Leave blank for default.')
			.addText(text => text
				.setPlaceholder('4px 8px')
				.setValue(this.plugin.settings.itemPadding)
				.onChange(async (value) => {
					this.plugin.settings.itemPadding = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Item Margin')
			.setDesc('Adjust margin around the file/folder items (e.g., 2px 0px). Leave blank for default.')
			.addText(text => text
				.setPlaceholder('0px')
				.setValue(this.plugin.settings.itemMargin)
				.onChange(async (value) => {
					this.plugin.settings.itemMargin = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Tree Indentation')
			.setDesc('Adjust the indentation space for nested files and folders (e.g., 15px, 20px, 1.5em). Leave blank for default.')
			.addText(text => text
				.setPlaceholder('20px')
				.setValue(this.plugin.settings.treeIndent)
				.onChange(async (value) => {
					this.plugin.settings.treeIndent = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl).setHeading().setName('Headings Navigation');

		new Setting(containerEl)
			.setName('Show Headings in Tree')
			.setDesc('Display markdown headings (H1-H6) underneath files in the file explorer.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showHeadings)
				.onChange(async (value) => {
					this.plugin.settings.showHeadings = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show headings up to')
			.setDesc('Limit the depth of headings displayed in the file explorer. Headings deeper than the selected level will be completely hidden.')
			.addDropdown(dropdown => dropdown
				.addOptions({ 'H1': 'H1', 'H2': 'H2', 'H3': 'H3', 'H4': 'H4', 'H5': 'H5', 'H6': 'H6' })
				.setValue(this.plugin.settings.maxHeadingLevel)
				.onChange(async (value) => {
					this.plugin.settings.maxHeadingLevel = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto-expand down to')
			.setDesc('Determine how deep the heading tree should be automatically expanded when you open or view a file. Select "Nothing" to keep them collapsed by default.')
			.addDropdown(dropdown => dropdown
				.addOptions({ 'Nothing': 'Nothing', 'H1': 'H1', 'H2': 'H2', 'H3': 'H3', 'H4': 'H4', 'H5': 'H5', 'H6': 'H6', 'All levels': 'All levels' })
				.setValue(this.plugin.settings.autoExpandLevel)
				.onChange(async (value) => {
					this.plugin.settings.autoExpandLevel = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Arrow expands')
			.setDesc('Control what happens when you click a collapse arrow. "Next level" expands one step at a time, while "All levels" opens the entire branch at once.')
			.addDropdown(dropdown => dropdown
				.addOptions({ 'All levels': 'All levels', 'Next level': 'Next level' })
				.setValue(this.plugin.settings.arrowExpands)
				.onChange(async (value) => {
					this.plugin.settings.arrowExpands = value;
					await this.plugin.saveSettings();
				}));
	}
}

/* nosourcemap */