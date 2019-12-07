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

let user_list = [];


let idxs = -1;
const funspoj = async function(s) {
    idxs += 1;
    if(idxs < user_list.length) {
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

                model.outJudgeResult.create(obj).catch(err => {});
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
                if($(this).parent().parent().prev().text().trim() !== '푼 문제') return;
                if($(this).text().trim() === '') return;
                const obj = { problem_number: `boj/${$(this).text().trim()}`,
                                oj_id: user_list[idxb].boj_id,
                                oj: 'boj',
                                pending_link: ''};
                obj.pending_link = `https://www.acmicpc.net/status?problem_id=${$(this).text().trim()}&user_id=${obj.oj_id}&language_id=-1&result_id=-1`;
                model.outJudgeResult.create(obj).catch(err => {});
            });

            console.log(user_list[idxb].nickname + ' boj');
            funboj(b).catch(err => {console.log(err);});
        }
        done();
    }
});



db.once('open', () => {
    model.user.find({}).then(result => {
        user_list = result;
        
        //idxs = -1;
        //funspoj(s).catch(err => { console.log(err); });

        idxb = -1;
        funboj(b).catch(err => { console.log(err); });
    }).catch(err => {
        console.log(err);
    });
});
