const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    role : {type : Number, enum : ['Teacher', 'Student','SuperUser']},
    email : {type : String , required : true, match : /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, lowercae: true, unique: true},
    password : String,
    name : String,
    email_auth : Boolean,
    email_token : String,
    solved_problems : [Number],
    salt: String,
    nickname : { type: String, unique: true },
    codeforces_id: String,
    boj_id: String,
    spoj_id: String
});

const outJudgeResultSchema = new mongoose.Schema({
    pending_link: { type: String, unique: true},
    oj: String,
    oj_id: String,
    problem_number: String
});

module.exports = {
    user: mongoose.model('User', userSchema),
    outJudgeResult: mongoose.model('outJudgeResult', outJudgeResultSchema)
};