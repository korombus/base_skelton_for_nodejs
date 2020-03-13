var express = require('express');
var speakeasy = require('speakeasy');
var qrcode = require('qrcode');
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
  if(req.user['twofa']){
    // 解除のためのトークンを発行
    res.render('change_twofa_my', { message: req.location_page_lang, on: true, err: err });
  } else {
    // QRコード生成
    var secret = speakeasy.generateSecret({name: 'skelton', issuer: 'Skelton'});
    const url = speakeasy.otpauthURL({secret: secret.ascii, label: encodeURIComponent('skelton'), issuer: 'Skelton'});
    qrcode.toDataURL(url, (errCode, qr) =>{
      // コードにエラーがなければそのまま表示
      if(util.isEmpty(errCode)){
        res.render('change_twofa_my', { message: req.location_page_lang, on: false, qrcode: qr, secret: secret.base32, err: err, _csrf: req.csrfToken() });
      }
    });
  }
});

router.post('/', function(req, res, next){
  util.resetObjectArray(err);

  // 二段階認証がされていた場合は解除して、QRコードを新たに生成
  if(req.user['twofa']){
    // 二段階認証を解除するためにメアドを取得
    user.getEmail(req.user.userId).then(function(email){
      // 二段階認証設定をOFFにする
      user.updateUserData(req.user.userId, email[0]['email'], {'twofa': '00', 'twofa_key': '00'}, [0, ""]).then(function(rows){
        req.user['twofa'] = false;
        // QRコード生成
        var secret = speakeasy.generateSecret({name: 'skelton', issuer: 'Skelton'});
        const url = speakeasy.otpauthURL({secret: secret.ascii, label: encodeURIComponent('skelton'), issuer: 'Skelton'});
        qrcode.toDataURL(url, (errCode, qr) =>{
          // コードにエラーがなければそのまま表示
          if(util.isEmpty(errCode)){
            res.render('change_twofa_my', { message: req.location_page_lang, on: false, qrcode: qr, secret: secret.base32, err: err, _csrf: req.csrfToken() });
          }
        });
      }).catch(function(err){
        err.Other = true;
        res.render('change_twofa_my', { message: req.location_page_lang, on: true, err: err, _csrf: req.body._csrf });
      });
    }).catch(function(err){
      err.Other = true;
      res.render('change_twofa_my', { message: req.location_page_lang, on: true, err: err, _csrf: req.body._csrf });
    });
  }
  // 二段階認証を新たに設定
  else {
    // 入力値があるかどうかを確認
    err.errEmpty = util.isEmpty(req.body.code);
    // 入力値が正しいかを確認
    err.errCode = !speakeasy.totp.verify({secret: req.body.sec, encoding: 'base32', token: req.body.code });

    // エラーがあるかを確認
    if(util.checkObjectArray(err)) {
      res.render('change_twofa_my', { message: req.location_page_lang, on: false, qrcode: req.body.qr, secret: req.body.sec,err: err, _csrf: req.body._csrf });
    } else {
      // 二段階認証を設定するためにメアドを取得
      user.getEmail(req.user.userId).then(function(email){
        // 二段階認証設定をONにする
        user.updateUserData(req.user.userId, email[0]['email'], {'twofa': '00', 'twofa_key': '00'}, [1, req.body.sec]).then(function(rows){
          req.user['twofa'] = true;
          res.render('change_twofa_my', { message: req.location_page_lang, on: true, err: err, _csrf: req.body._csrf });
        }).catch(function(err){
          err.Other = true;
          res.render('change_twofa_my', { message: req.location_page_lang, on: false, qrcode: req.body.qr, secret: req.body.sec,err: err, _csrf: req.body._csrf });
        });
      }).catch(function(err){
        err.Other = true;
        res.render('change_twofa_my', { message: req.location_page_lang, on: false, qrcode: req.body.qr, secret: req.body.sec,err: err, _csrf: req.body._csrf });
      });
    }
  }
});

module.exports = router;
