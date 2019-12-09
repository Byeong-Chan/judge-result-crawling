const mongoose = require('mongoose');
const config = require('./config.js');

/* ---------
 mongoose connected */

mongoose.connect(config.mongodbUri, {useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true, useFindAndModify: false });
mongoose.Promise = global.Promise;

const db = mongoose.connection;
db.on('error', console.error);

const model = require('./model');
const Crawler = require('crawler');

let qidx = 0;
const queue = [];

const insertMongo = async function() {
    qidx++;
    const obj = queue[qidx - 1];
    model.outJudgeResult.create(obj).then(result => {
        if(qidx < queue.length) insertMongo().catch(err=>{console.log(err)});
    }).catch(err => {
        console.log(err);
        model.outJudgeResult.updateOne({problem_number: obj.problem_number, oj_id: obj.oj_id, oj: obj.oj},
            {
                $set: {
                    pending_link: obj.pending_link,
                }
            }).then(result=> {
            if(qidx < queue.length) insertMongo().catch(err=>{console.log(err)});
        }).catch(err =>{
            console.log(err);
            if(qidx < queue.length) insertMongo().catch(err=>{console.log(err)});
        })
    })
};

const queueing = async function(obj) {
    if(queue.length === qidx) {
        queue.push(obj);
        return insertMongo();
    }
    else {
        queue.push(obj);
    }
};


let user_list = [];


let idxs = -1;
const funspoj = async function(s) {
    idxs += 1;
    if(idxs < user_list.length) {
        if(user_list[idxs].spoj_id === undefined || user_list[idxs].spoj_id === '') {
            funspoj(s).catch(err => { console.log(err) });
            return;
        }
        s.queue(`https://www.spoj.com/users/${user_list[idxs].spoj_id}`);
    }
};

const s = new Crawler({
    rateLimit: 1000,

    // This will be called for each crawled page
    callback: function (error, res, done) {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;
            $('#user-profile-tables td a').each(function(idx) {
                if($(this).text().trim() === '') return;
                const obj = { problem_number: '', oj_id: user_list[idxs].spoj_id, oj: 'spoj', pending_link: ''};
                obj.pending_link = 'https://www.spoj.com' + $(this)[0].attribs.href;
                obj.problem_number = 'spoj/' + $(this).text().trim();

                queueing(obj).catch(err => {console.log(err)});
            });
            console.log(user_list[idxs].nickname + ' spoj');
            funspoj(s).catch(err => {console.log(err);});
        }
        done();
    }
});



let idxb = -1;
const funboj = async function(b) {
    idxb += 1;
    if(idxb < user_list.length) {
        if(user_list[idxb].boj_id === undefined || user_list[idxb].boj_id === '') {
            funboj(b).catch(err => { console.log(err) });
            return;
        }
        b.queue(`https://www.acmicpc.net/user/${user_list[idxb].boj_id}`);
    }
};


const b = new Crawler({
    rateLimit: 1000,

    // This will be called for each crawled page
    callback: function (error, res, done) {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;
            $('.problem_number a').each(function(idx) {
                if ($(this).parent().parent().prev().text().trim() !== '푼 문제') return;
                if ($(this).text().trim() === '') return;
                const obj = {
                    problem_number: `boj/${$(this).text().trim()}`,
                    oj_id: user_list[idxb].boj_id,
                    oj: 'boj',
                    pending_link: ''
                };
                obj.pending_link = `https://www.acmicpc.net/status?problem_id=${$(this).text().trim()}&user_id=${obj.oj_id}&language_id=-1&result_id=-1`;

                queueing(obj).catch(err => {
                    console.log(err);
                });
            });

            console.log(user_list[idxb].nickname + ' boj');
            funboj(b).catch(err => {console.log(err);});
        };
        done();
    }
});



let idxc = -1;
let prev = [];

const funcodeforces = async function() {
    idxc += 1;
    if(idxc < user_list.length) {
        if(user_list[idxc].codeforces_id === undefined || user_list[idxc].codeforces_id === '') {
            funcodeforces().catch(err => { console.log(err); });
            return;
        }
        console.log(user_list[idxc].nickname + ' codeforces');
        let page = 0;
        prev = [];
        const funcpage = async function(cp) {
            page += 1;
            cp.queue(`https://codeforces.com/submissions/${user_list[idxc].codeforces_id}/page/${page}`);
        };

        const cp = new Crawler({
            rateLimit: 1000,

            // This will be called for each crawled page
            callback: function (error, res, done) {
                if (error) {
                    console.log(error);
                } else {
                    const $ = res.$;
                    const arr = [];
                    const brr = [];
                    const crr = [];
                    const drr = [];
                    console.log(page);
                    $('.status-frame-datatable tr').each(function(idx) {
                        if(idx === 0) return;
                        let obj = { problem_number: '', oj_id: user_list[idxc].codeforces_id, oj: 'codeforces', pending_link: ''};
                        $(this).find('td').each(function(idx) {
                            if($(this).text().trim() === '') return;
                            if(idx === 0) {
                                obj.pending_link = $(this).text().trim();
                            }
                            if(idx === 3) {
                                let tmp = '';
                                $(this).find('a')[0].attribs.href.split('/').map((val) => {
                                    if(val === 'gym') crr.push('gym');
                                    else if(val === 'contest') crr.push('contest');
                                    else if(val !== 'problem' && val !== '') {
                                        if(tmp === '') brr.push(val);
                                        tmp = tmp.concat(val);
                                    }
                                });
                                obj.problem_number = 'codeforces/' + tmp;
                            }
                            if(idx === 5) {
                                drr.push($(this).text().trim());
                            }
                        });
                        obj.pending_link = `https://codeforces.com/contest/${brr[idx - 1]}/submission/${obj.pending_link}`;
                        arr.push(obj);
                    });

                    if(arr.length > 0 && prev.length > 0 && arr[0].pending_link === prev[0].pending_link) {
                        funcodeforces().catch(err => { console.log(err); });
                    }
                    else if(arr.length === 0) {
                        funcodeforces().catch(err => { console.log(err); });
                    }
                    else {
                        prev = arr;

                        for(let i = 0; i < arr.length; i++) {
                            if(drr[i] !== 'Accepted') continue;
                            if(crr[i] !== 'contest') continue;
                            queueing(arr[i]).catch(err => {console.log(err)});
                        }
                        funcpage(cp).catch(err => { console.log(err); });
                    }
                }
                done();
            }
        });

        funcpage(cp).catch(err => { console.log(err); });
    }
};




db.once('open', () => {
    model.user.find({}).then(result => {
        user_list = result;
        qidx = 0;
        queue.splice(0, queue.length);

        idxs = -1;
        funspoj(s).catch(err => { console.log(err); });

        idxb = -1;
        funboj(b).catch(err => { console.log(err); });

        idxc = -1;
        funcodeforces().catch(err => { console.log(err); });
    }).catch(err => {
        console.log(err);
    });

    setInterval(() => {
        model.user.find({}).then(result => {
            user_list = result;
            qidx = 0;
            queue.splice(0, queue.length);

            idxs = -1;
            funspoj(s).catch(err => { console.log(err); });

            idxb = -1;
            funboj(b).catch(err => { console.log(err); });

            idxc = -1;
            funcodeforces().catch(err => { console.log(err); });
        }).catch(err => {
            console.log(err);
        });
    }, 86400000);
});