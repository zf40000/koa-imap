var Imap = require("imap");
var MailParser = require("mailparser").MailParser;
var fs = require("fs");

let imap;
// 连接邮箱
const _connect = () => new Promise((resolve, reject) => {
    // 处理异常
    imap.on("error", function (err) {
        console.log('found error **************', err);
        console.log(imap);
        
        // console.log(err);
        return resolve({ success: false, err });
    });
    imap.once("ready", async function () {
        await _id();
        return resolve('connect ok');
    });
    imap.connect();
});

//发送id命令
const _id = () => {
    return new Promise((resolve, reject) => {
        imap.id({ name: 'jefftest' }, function (err, cb) {
            if (err) throw err;
            console.log('id ok', cb);
            return resolve(cb);
        });
    });
}

// 得到所有的盒子
const _getBoxes = () => {
    return new Promise((resolve, reject) => {
        imap.getBoxes(function (err, boxes) {
            if (err) throw err;
            console.log('getBoxes ok');
            return resolve(boxes);
        });
    });
}

// 打开邮箱盒子
const _openBox = (boxName) => {
    return new Promise((resolve, reject) => {
        //注意第二个参数代表是否只读.
        imap.openBox(boxName, false, (err, box) => {
            if (err) throw err;
            console.log('open box ok', box);
            return resolve(box);
        });
    });
}

const _append = (msgData, options) => {
    return new Promise((resolve, reject) => {
        imap.append(msgData, options, function (err) {
            if (err) {
                throw err;
            }
            return resolve('append mail ok');
        });
    });
}

// 搜索邮件列表
const _search = (filter) => {
    return new Promise((resolve, reject) => {
        const lastDay = 'May 20, 2017';
        // 第一个元素表示标签,第二元素表示筛选条件
        const searchFilter = ["All", ["SINCE", lastDay]];
        // const searchFilter = ["All"];
        imap.search(searchFilter, function (err, results) {
            if (err) throw err;
            console.log('search ok', results);
            return resolve(results);
        });
    });
}
// 通过 uid search 1 2 获得uid
const _id2uid = (id) => {
    return new Promise((resolve, reject) => {
        const searchFilter = [`${id}`];

        imap.search(searchFilter, function (err, results) {
            if (err) throw err;
            if (!results[0]) return false;
            // console.log('id2uid ok',results);
            return resolve(results[0]);
        });
    });
};
// 通过 search uid xxxx获得id,
// imap.seq.search([['UID','1658475940']],function(err,_r){
//     console.log('==========================');
//     console.log(_r);
//     throw 'test';
// });
const _uid2id = (uid) => {
    return new Promise((resolve, reject) => {
        const searchFilter = [['UID', `${uid}`]];
        imap.seq.search(searchFilter, function (err, results) {
            if (err) throw err;
            if (!results[0]) return false;
            return resolve(results[0]);
        });
    });
};

// 增加标记
const _addFlags = ({ uids, flags }) => {
    return new Promise((resolve, reject) => {
        imap.addFlags(uids, flags, function (err) {
            if (err) {
                throw err;
            }
            return resolve('addFlags ok');
        });
    });
};
// 删除标记
const _delFlags = ({ uids, flags }) => {
    return new Promise((resolve, reject) => {
        imap.delFlags(uids, flags, function (err) {
            if (err) {
                throw err;
            }
            return resolve('_delFlags ok');
        });
    });
};


// 解析邮件内容
const _parserMail = (stream, uid) => {
    return new Promise((resolve, reject) => {
        const item = {};
        const mailparser = new MailParser();
        stream.pipe(mailparser);
        mailparser.on("headers", function (headers) {
            console.log('邮件头获取完成', uid);
            // item.header = 'mail headers';
            // console.log("邮件主题: " + headers.get("subject"));
            item['subject'] = headers.get("subject");
            // console.log("发件人: " + headers.get("from").text);
            item['from'] = headers.get("from").text;
            // console.log("收件人: " + headers.get("to").text);
            item['to'] = headers.get("to").text;
            item['cc'] = headers.get("cc")?.text;
            // 密送的信息只有在发件人的发件箱中可以看到,收件人的邮件信息中看不到
            item['bcc'] = headers.get("bcc")?.text;
        });
        // data 总会再 header 后,如果一个邮件同时存在附件和正文,也会触发2次.
        mailparser.on("data", function (data) {
            if (data.type === "text") {

                console.log('邮件正文获取完成', uid, data.type);
                item['html'] = data.html;

                //目前的测试数据发现,所有的邮件正文的解析完成都是最后,所以这里resolve,,,,后期可能有变化,考虑通过 promise.all去实现
                console.log('开始resolve,', item);
                resolve(item);
            }
            if (data.type === "attachment") {
                console.log('邮件附件获取完成', uid, data.type);
                //附件
                item.attachment = {
                    contentType: data.contentType,
                    partId: data.partId,
                    filename: data.filename,
                }
                data.content.pipe(fs.createWriteStream('./attachments/' + data.filename)); //保存附件到当前目录下
                data.release();
            }
            // console.log('mailparser on data',uid);

        });
    });
}

// 获得邮件正文
const _fetch = (uids) => {
    return new Promise((resolve, reject) => {
        // 邮件结果容器
        const list = {};

        const f = imap.fetch(uids, { bodies: "" });
        f.once("error", function (err) {
            console.log("邮件fetch出现错误: " + err);
        });
        f.once("end", function () {
            //这个触发时,可能 parserMail 还没有执行完,所以不能这里resolve
            console.log("所有邮件fetch完成!");
        });

        // 以下会触发多次,每次触发后,结果都放到list中
        let times = 0;
        f.on("message", function (msg, seqno) {
            console.log(`${seqno} 号邮件信息获取完毕`);
            // 开始解析
            // 邮件属性获取完成后触发,attrs中包含了flags,如果有多封邮件会触发多次
            // attributes 会在 body后触发
            msg.on('attributes', function (attrs) {
                console.log(seqno, 'attributes', attrs.uid);

                list[seqno] = list[seqno] || {};
                const item = list[seqno];
                item['flags'] = attrs.flags;
                item['uid'] = attrs.uid;
                item['date'] = attrs.date;
            })
            msg.on("body", async function (stream, info) {
                // console.log(seqno,'body',stream,info);
                list[seqno] = list[seqno] || {};
                const item = list[seqno];
                item.size = info.size;

                // 2022年8月11日 by jeff,改为传递uid,用来处理附件名
                // const result = await parserMail(stream,seqno);
                const uid = await _id2uid(seqno);
                console.log('found uid:', seqno, uid);

                const result = await _parserMail(stream, uid);
                Object.keys(result).forEach(key => {
                    item[key] = result[key];
                });

                // 返回,目前测试发现,解析完成前, end可能就触发,所以暂时放在这里resove,后期考虑通过 promise完成,避免异常情况
                times++;
                console.log('body 解析完成');
                if (times == uids.length) {
                    resolve(list);
                }
            });
            // 不能在下面的resolve,因为end触发时,解析还没完成.
            // msg.on('end',()=>{
            //     console.log('所有的邮件解析完成=============');                
            //     resolve(list);
            // })
        });
    });
}

// ******************需要暴漏的接口****************************

// 根据uid得到mail信息
const getMail = async function ({ boxName, uid }) {
    const box = await _openBox(boxName);
    const mails = await _fetch([uid]);
    imap.end();
    const key = Object.keys(mails)[0];
    return mails[key];
}

// 增加邮件标记
const addFlags = async function ({ boxName, uids, flags }) {
    const box = await _openBox(boxName);
    const res = await _addFlags({ uids, flags });
    imap.end();
    return res;
}
// 增加邮件标记
const delFlags = async function ({ boxName, uids, flags }) {
    const box = await _openBox(boxName);
    const res = await _delFlags({ uids, flags });
    imap.end();
    return res;
}

// 得到邮件列表
const getMails = async function ({ boxName, filter }) {
    const box = await _openBox(boxName);
    const results = await _search(filter);
    const mails = await _fetch(results);
    imap.end();
    return mails;
}

// 创建邮件
const appendMail = async function (msgData, options) {
    const res = await _append(msgData, options);
    imap.end();
    return res;
}

// 关闭连接
const close = () => {
    console.log('begin close');
    imap.end();
}
module.exports = function (config) {
    return new Promise((resolve, reject) => {
        console.log('new Imap fired');
        
        imap = new Imap(config);
        // 处理结束
        imap.on("end", function () {
            console.log("关闭邮箱\n\n\n\n");
        });

        _connect().then(res => {
            if (res.success === false) {
                //处理报错
                return resolve(res);
            }
            return resolve({
                getBoxes: async () => {
                    const boxes = await _getBoxes();
                    imap.end();
                    return boxes;
                },
                getMails,
                getMail,
                addFlags,
                delFlags,
                appendMail,
                close,
            });
        })
    })
}