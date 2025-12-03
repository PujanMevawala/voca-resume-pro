import * as Minio from 'minio';

export class MinioService {
    constructor({ endPoint, port, useSSL, accessKey, secretKey, bucket }) {
        this.client = new Minio.Client({ endPoint, port, useSSL, accessKey, secretKey });
        this.bucket = bucket;
    }

    async ensureBucket() {
        const exists = await this.client.bucketExists(this.bucket).catch(() => false);
        if (!exists) {
            await this.client.makeBucket(this.bucket, 'us-east-1');
        }
    }

    async upload({ objectName, stream, size, contentType }) {
        await this.client.putObject(this.bucket, objectName, stream, size, { 'Content-Type': contentType });
        return { bucket: this.bucket, objectName };
    }

    async getStream(objectName) {
        return this.client.getObject(this.bucket, objectName);
    }

    async removeObject(objectName) {
        return this.client.removeObject(this.bucket, objectName);
    }
}
