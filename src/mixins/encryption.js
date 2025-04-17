import Crypto from 'crypto-js';
// import * as uuid from 'uuid';

const secretKey = import.meta.env.VITE_APP_SECRET_KEY;

export const encryptData = (data) => {
    return Crypto.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

export const decryptData = (data) => {
    try {
        if (data) {
            return JSON.parse(Crypto.AES.decrypt(data, secretKey).toString(Crypto.enc.Utf8));
        }
    } catch (e) {
        // this.location.reload();
    }
    // if (data) {
    //     return JSON.parse(Crypto.AES.decrypt(data, secretKey).toString(Crypto.enc.Utf8));
    // }
    return null;
};