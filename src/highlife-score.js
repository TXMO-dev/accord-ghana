// Original, sparse highlife-inspired arrangement. Sixteenth-note grid, 92 BPM.
export const beatSeconds=60/92;
const chords=[[60,64,67,71],[65,69,72,76],[62,65,69,72],[67,71,74,77]];
export function highlifeStep(step){
 const bar=Math.floor(step/16)%8,tick=step%16,chord=chords[Math.floor(bar/2)],notes=[];
 if([2,6,10,14].includes(tick))notes.push({voice:'guitar',midi:chord[(tick/4|0)%4]+12,duration:.17,gain:.08});
 if([3,9,15].includes(tick))notes.push({voice:'guitar',midi:chord[(bar+tick)%4],duration:.22,gain:.045});
 if([0,6,10].includes(tick))notes.push({voice:'bass',midi:chord[0]-24+(tick===10?7:0),duration:.32,gain:.13});
 if(tick%2===0)notes.push({voice:'shaker',midi:0,duration:.055,gain:tick%4===0?.018:.012});
 if([4,12].includes(tick))notes.push({voice:'rim',midi:0,duration:.055,gain:.025});
 // Short responses leave several bars free of lead instruments.
 if(bar===3&&[2,6,10].includes(tick))notes.push({voice:'sax',midi:[69,67,64][[2,6,10].indexOf(tick)],duration:.43,gain:.035});
 if(bar===7&&[0,5,10].includes(tick))notes.push({voice:'flute',midi:[79,76,74][[0,5,10].indexOf(tick)],duration:.55,gain:.045});
 return notes;
}
