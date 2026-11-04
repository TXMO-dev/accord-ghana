export function createStudioAudio(createContext){
 let context,output,enabled=true;
 return {context(){if(!context){context=createContext();output=context.createGain();output.gain.value=enabled?1:0;output.connect(context.destination);}return context;},destination(){this.context();return output;},setEnabled(value){enabled=!!value;if(output){output.gain.cancelScheduledValues(context.currentTime);output.gain.setValueAtTime(enabled?1:0,context.currentTime);}},dispose(){output?.disconnect();context?.close();}};
}
