// Archive state comes from the server, never inferred from a message's age.
export function historySessionWritable(turn){
  return !!turn?.conversation_id && turn.ended_at===null;
}
export function historySelection(turn){
  return historySessionWritable(turn)?{conversationId:turn.conversation_id,readOnly:false}
    :{conversationId:null,readOnly:true};
}
