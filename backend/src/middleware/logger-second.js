const loggerSecond = (req, res, next) => {
  console.log("Second logger middleware");

  next();
};

module.exports = loggerSecond;