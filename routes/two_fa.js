var express = require('express');
var passport = require('passport');
var speakeasy = require('speakeasy');
var user = require('../controller/user.js');
var util = require('./../common/util.js');
var router = express.Router();

var err = {
  'errEmpty': false,
  'errCode': false,
  'errOther': false
}

/* GET home page. */
router.get('/', function(req, res, next) {
  // 二段階認証が設定されているかを確認
  if(!req.user['twofa']){
    res.redirect('/my');
  } else {
    res.render('two_fa', { message: req.location_page_lang, err: err, _csrf: req.csrfToken()});
  }
});

router.post('/', function(req, res, next){
  util.resetObjectArray(err);

  // 入力値があるかどうかを確認
  err.errEmpty = util.isEmpty(req.body.code);

  // 一先ず入力エラーがないかを確認
  if(util.checkObjectArray(err)){
    res.render('two_fa', { message: req.location_page_lang, err: err, _csrf: req.body._csrf});
  } else {
    // 二段階認証のシークレットキーを取得して、入力値を比較
    user.getTwoFaSetting(req.user.userId).then(function(code){
      // 設定されているキーと入力値が一致しているかを確認
      err.errCode = !speakeasy.totp.verify({secret: code[0]['twofa_key'], encoding: 'base32', token: req.body.code });
      // 入力と設定が不一致であればエラーを表示
      if(util.checkObjectArray(err)){
        res.render('two_fa', { message: req.location_page_lang, err: err, _csrf: req.body._csrf});
      } else {
        // 何も問題なければマイページにそのまま遷移
        res.redirect('/my');
      }
    }).catch(function(err){
      err.Other = true;
      res.render('two_fa', { message: req.location_page_lang, on: false, qrcode: req.body.qr, secret: req.body.sec,err: err, _csrf: req.body._csrf });
    });
  }
});
module.exports = router;
