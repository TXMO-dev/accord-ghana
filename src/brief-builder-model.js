export function buildBrief({deliverables,criteria,date,revisions,exclusions}){
 const clean=(value,max)=>String(value??'').trim().slice(0,max);
 deliverables=clean(deliverables,1000);criteria=clean(criteria,1000);exclusions=clean(exclusions,600);
 if(!deliverables||!criteria)throw Error('Add the deliverables and review criteria first.');
 if(!/^[0-9]$/.test(String(revisions)))throw Error('Choose between 0 and 9 revision rounds.');
 if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Choose a valid target date.');
 return ['DELIVERABLES',deliverables,'','ACCEPTANCE CHECKS',criteria,'',`REVISION ROUNDS: ${revisions}`,date?`TARGET DELIVERY DATE: ${date} (agree the time and timezone separately).`:'TARGET DELIVERY DATE: To be agreed before work starts.',exclusions?'\nOUT OF SCOPE\n'+exclusions:'','\nThe client reviews the delivery against these conditions before approving release. Changes to scope require both parties to agree. The target date and revision rounds are agreed terms, not automatic contract timers or payment triggers.'].filter(v=>v!==undefined).join('\n');
}
export const briefExamples={
 design:{deliverables:'One logo direction, final SVG and PNG files, colour codes and a one-page usage guide.',criteria:'All agreed files open correctly. Colours and layout match the direction approved by the client.',revisions:'2'},
 website:{deliverables:'One responsive landing page with the agreed sections, preview link and source files.',criteria:'Check phone and desktop layouts. All agreed links and forms work with the supplied content.',revisions:'1'},
 software:{deliverables:'One agreed software feature, source changes, setup instructions and a test report.',criteria:'The agreed user scenarios pass. The client can run the feature using the supplied instructions.',revisions:'1'}
};
