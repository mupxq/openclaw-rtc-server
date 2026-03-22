有一些不一样的需求, 用户可能需要多个scenes, 每个scenes对应一个agent,
  每个agent有自己的roomid userid taskid, 还可以选择不同的, tts voice_type, 每个agent
  有自己的LLMConfig, 主要是Url和api key, x-openclaw-agent-id 是agent的名字,
  x-openclaw-session-key 保持和房间号一样就可以, roomID是一个UUID,以room开头.
  WelcomeMessage默认是你好,用户也可以自己编辑.
  所以,在前端页面里,当用户登录,需要有添加修改agent的页面,也可以删除agnet,

当用户登录完，首先看到的是，自己的不同agent的list，然后选择和哪个agent，通话

现在是后端服务器，但是，这些api接口需要暴露出来，数据库也要根据这个修改，你问我几个问题，咱们核对一下需求是否明确

优化TTS支持ASMR

agent name还有agent昵称   agent分为agent id和agent name
