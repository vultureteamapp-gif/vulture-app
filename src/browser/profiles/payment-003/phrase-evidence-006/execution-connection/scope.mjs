export const channel=typeof location!=='undefined'&&new URLSearchParams(location.search).get('channel')==='real'?'real':'offline';
export const storagePrefix='document-phrase-006-execution:'+channel+':';
