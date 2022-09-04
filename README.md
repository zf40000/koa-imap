# 安装
pnpm install

# 启动服务端
node index

# 测试
双击 test.html,直接浏览器中打开即可

# 如何监听服务器端的执行语句
有时为了调试,需要观察服务器上执行的imap命令,需要设置 配置项中的 debug: console.log,

# Error: This socket has been ended by the other party 报错
可能服务器会报以下错误:

```text
Error: This socket has been ended by the other party
    at Socket.writeAfterFIN [as write] (node:net:474:14)
    at JSStreamSocket.doWrite (node:internal/js_stream_socket:175:19)
    at JSStream.onwrite (node:internal/js_stream_socket:33:57)
    at TLSSocket.Socket._final (node:net:443:28)
    at callFinal (node:internal/streams/writable:694:27)
    at prefinish (node:internal/streams/writable:723:7)
    at finishMaybe (node:internal/streams/writable:733:5)
    at TLSSocket.Writable.end (node:internal/streams/writable:631:5)
    at TLSSocket.Socket.end (node:net:609:31)
    at endWritableNT (node:internal/streams/readable:1372:12) {
  code: 'EPIPE',
  source: 'socket'
}
```

There's nothing this module can do about that, you just have to reconnect when that happens. Maybe gmail has a maximum imap session time limit?

> https://github.com/mscdex/node-imap/issues/869