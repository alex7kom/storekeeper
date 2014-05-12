module.exports = function stdin(callback, notBlankMessage) {
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', function (data) {
    process.stdin.pause();
    data = data.toString().trim();
    if (data == '' && notBlankMessage) {
      console.log(notBlankMessage);
      stdin(callback, notBlankMessage);
    } else {
      callback(data);
    }
  });
};