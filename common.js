exports.BaseResponse = (success, message, data) => {
    return {
      success,
      message,
      data,
    };
  };