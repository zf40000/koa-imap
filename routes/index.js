
const router = require('koa-router')();


// let connected = false;
const config = {
    user: "dariux001@163.com", //你的邮箱账号
    password: "JFVZOKSIHCONICPB", //你的邮箱密码
    host: "imap.163.com", //邮箱服务器的主机地址
    port: 993, //邮箱服务器的端口地址
    tls: true, //使用安全传输协议
    // tlsOptions: { rejectUnauthorized: false }, //禁用对证书有效性的检查
    // 可以输出调试信息
    // debug: console.log,
}
// const config1 = {
//     user: "xzliweijian@163.com", //你的邮箱账号
//     password: "XVOIEVYMKYDLPAFY", //你的邮箱密码
//     host: "imap.163.com", //邮箱服务器的主机地址
//     port: 993, //邮箱服务器的端口地址
//     tls: true, //使用安全传输协议
//     tlsOptions: { rejectUnauthorized: false }, //禁用对证书有效性的检查
//     // 可以输出调试信息
//     debug: console.log,
// }

// 设置api路径的前缀
// router.prefix('/users');

router.get('/', async (ctx, next) => {
    console.log('路由 /')
    // 这里有next 会继续往下匹配,否则就会中断执行,
    next()
})
router.get('/', function (ctx, next) {
    console.log('因为上面有 next,这里第二次匹配到路由 /');
    ctx.body = `
    <pre>
        1.测试get参数 <a href='/get?a=aa&b=bb'>访问带get参数的页面</a>
        2,测试post 直接双击 test.html,在浏览器中打开提交即可
    </pre>
    `;
})

// 测试get
router.get('/get', (ctx, next) => {
    let url = ctx.url;
    //从request中获取GET请求
    let request = ctx.request;
    let req_query = request.query;
    let req_querystring = request.querystring;

    //从上下文中直接获取
    let ctx_query = ctx.query;
    let ctx_querystring = ctx.querystring;

    ctx.body = {
        url,
        req_query,
        req_querystring,
        ctx_query,
        ctx_querystring
    }
    // console.log('router /get')
});

// 测试post
router.post('/post', (ctx, next) => {
    // 获得post参数
    const post = ctx.request.body;
    console.log('post数据:',post);

    ctx.body={
        "success":true,
        'params':post,
        "message":'增加数据成功'
    };
    next();
});

// 获得所有的文件夹
router.post('/getMailboxes',async (ctx, next) => {
    const post = ctx.request.body;

    const useMail = require('../hooks/useMail.js');
    
    const {getBoxes,close} = await useMail(config);
    
    const boxes = await getBoxes();
    // const mails = await getMails('INBOX');
    close();
    //获得邮件内容
    ctx.body = {
        success:true,
        boxes,
    }
});

// 获得邮件列表
router.post('/getMails',async (ctx, next) => {
    const post = ctx.request.body;

    const useMail = require('../hooks/useMail.js');
    
    const {getMails,close,success,err} = await useMail(config);
    //如果imap报错,返回给前端,让前端看到
    if(success===false) {
        console.log('发现usemail服务器报错');
        ctx.body = {success,err};
        return;
    }
    console.log('开始阻塞pending');
    const mails = await getMails({boxName:post.boxName,filter:''});
    
    close();
    //获得邮件内容
    // console.log('发现usemail服务器报错');
    ctx.body = {
        success:true,
        mails
    }
});

// 获得邮件
router.post('/getMail',async (ctx, next) => {
    const post = ctx.request.body;
    const useMail = require('../hooks/useMail.js');
    const {getMail,close} = await useMail(config);
    const mail = await getMail({boxName:post.boxName,uid:post.uid});
    close();
    //获得邮件内容
    ctx.body = {
        success:true,
        mail
    }
});
// 新加邮件到草稿箱
router.post('/appendMail',async (ctx, next) => {
    const post = ctx.request.body;
    const useMail = require('../hooks/useMail.js');
    const {appendMail,close} = await useMail(config);
    //注意邮件内容前后必须有2个空格,这事mime协议规定的.
    //这里只是使用了简单的格式,完整的格式需要参考: 
    //https://stackoverflow.com/questions/49889566/node-imap-append-new-email-to-drafts#comment86795418_49889566
    // http://www.ruanyifeng.com/blog/2008/06/mime.html
    const content=['To: jeff@eqinfo.com.cn','From: jeff@ewer.com','Subject: testcontent','','asdfasdfasdfasdf',''];
    const res = await appendMail(content.join('\r\n'),{mailbox:'草稿箱'});
    close();
    //获得邮件内容
    ctx.body = {
        success:true,
        data:res
    }
});


//增加标记
//可用标记: 'Answered','Seen','Flagged','Deleted','Draft'
router.post('/addFlags',async (ctx, next) => {
    const {boxName,uids,flags} = ctx.request.body;
    const useMail = require('../hooks/useMail.js');
    const {addFlags,close} = await useMail(config);
    const data = await addFlags({boxName,uids,flags});
    close();
    //获得邮件内容
    ctx.body = {
        success:true,
        data
    }
});
router.post('/delFlags',async (ctx, next) => {
    const {boxName,uids,flags} = ctx.request.body;
    const useMail = require('../hooks/useMail.js');
    const {delFlags,close} = await useMail(config);
    const data = await delFlags({boxName,uids,flags});
    close();
    //获得邮件内容
    ctx.body = {
        success:true,
        data
    }
});

module.exports = router;