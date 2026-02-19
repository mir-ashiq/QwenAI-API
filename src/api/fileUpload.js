// Simplified fileUpload.js - Direct HTTP calls, no browser automation, memory-based uploads
import { getAvailableToken } from './tokenManager.js';
import { logInfo, logError } from '../logger/index.js';
import path from 'path';
import { STS_TOKEN_API_URL } from '../config.js';
import fetch from 'node-fetch';
import OSS from 'ali-oss';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
const DEFAULT_FILE_TYPE = 'file';
const IMAGE_FILE_TYPE = 'image';
const DOCUMENT_FILE_TYPE = 'document';

export async function getStsToken(fileInfo) {
    const tokenObj = await getAvailableToken();
    if (!tokenObj || !tokenObj.token) {
        throw new Error('No valid authentication token available');
    }

    logInfo(`Requesting STS token for file: ${fileInfo.filename}`);

    try {
        const response = await fetch(STS_TOKEN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenObj.token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(fileInfo)
        });

        if (!response.ok) {
            const errorText = await response.text();
            logError(`Error getting STS token: ${response.status} ${errorText}`);
            throw new Error(`Failed to get STS token: ${response.status}`);
        }

        const stsData = await response.json();
        logInfo(`STS token successfully obtained for file: ${fileInfo.filename}`);
        return stsData;
    } catch (error) {
        logError(`Error getting STS token: ${error.message}`, error);
        throw error;
    }
}

export async function uploadFile(fileBuffer, fileName, stsData) {
    logInfo(`Starting file upload: ${fileName}`);

    if (!stsData?.file_path || !stsData?.access_key_id || !stsData?.access_key_secret ||
        !stsData?.security_token || !stsData?.region || !stsData?.bucketname) {
        throw new Error('Invalid or incomplete STS token data');
    }

    logInfo(`[OSS] Uploading via ali-oss SDK`);
    logInfo(`[OSS] Region: ${stsData.region}, Bucket: ${stsData.bucketname}`);

    try {
        const client = new OSS({
            region: stsData.region,
            accessKeyId: stsData.access_key_id,
            accessKeySecret: stsData.access_key_secret,
            stsToken: stsData.security_token,
            bucket: stsData.bucketname,
            secure: true
        });

        logInfo(`[OSS] File size: ${fileBuffer.length} bytes`);

        await client.put(stsData.file_path, fileBuffer);

        logInfo(`[OSS] File uploaded successfully`);
        return {
            success: true,
            fileName: fileName,
            url: stsData.file_url,
            fileId: stsData.file_id,
            filePath: stsData.file_path
        };
    } catch (error) {
        logError(`[OSS] Upload error: ${error.message}`, error);
        throw new Error(`OSS upload failed: ${error.message}`);
    }
}

export async function uploadFileToQwen(fileData) {
    try {
        const { buffer, filename, size, mimetype } = fileData;

        if (!buffer) {
            throw new Error('File buffer is required');
        }

        const fileExt = path.extname(filename).toLowerCase();

        let fileType = DEFAULT_FILE_TYPE;
        if (IMAGE_EXTENSIONS.includes(fileExt)) {
            fileType = IMAGE_FILE_TYPE;
        } else if (DOCUMENT_EXTENSIONS.includes(fileExt)) {
            fileType = DOCUMENT_FILE_TYPE;
        }

        const fileInfo = {
            filename: filename,
            filesize: size,
            filetype: fileType
        };

        const stsData = await getStsToken(fileInfo);
        const uploadResult = await uploadFile(buffer, filename, stsData);

        return {
            ...uploadResult,
            fileInfo,
            stsData
        };
    } catch (error) {
        logError(`Error in file upload process: ${error.message}`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

export default { getStsToken, uploadFile, uploadFileToQwen };
