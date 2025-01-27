const Readable = require('stream').Readable;
const ftpClient = require("basic-ftp");

module.exports = {
    init(config) {
        const getConnection = async () => {
            const client = new ftpClient.Client();
            await client.access({
                host: config.host,
                user: config.user,
                port: config.port,
                password: config.password,
                secure: config.secure,
            });
            return client;
        };

        const stream2buffer = async (stream) => {
            return new Promise((resolve, reject) => {
                const _buf = [];
                stream.on('data', (chunk) => _buf.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(_buf)));
                stream.on('error', (err) => reject(err));
            });
        }

        const uploadStream = async (inputFile) => {
            const file = { ...inputFile }; // Ajout: Création d'une copie de l'objet
            file.buffer = await stream2buffer(file.stream); // Ajout: Conversion du stream en buffer

            const path = `${config.path}${file.hash}${file.ext}`;
            const client = await getConnection();
            try {
                const source = new Readable();
                source._read = () => { };
                source.push(file.buffer);
                source.push(null);
                await client.uploadFrom(source, path);
            } catch (error) {
                throw error;
            } finally {
                await client.close();
            }
        };

        const deleteFile = async (file) => {
            const path = `${config.path}${file.hash}${file.ext}`;
            const client = await getConnection();

            try {
                await client.remove(path);
            } catch (error) {
                throw error;
            } finally {
                await client.close();
            }
        };

        return {
            async upload(file) {
                await uploadStream(file);
                file.url = `${config.baseUrl}${file.hash}${file.ext}`;
                delete file.buffer; // Ajout: Suppression du champ buffer
            },
          
            async uploadStream(file) {
                await uploadStream(file);
                file.url = `${config.baseUrl}${file.hash}${file.ext}`;
                delete file.buffer;
            },

            delete(file) {
                return new Promise((resolve, reject) => {
                    deleteFile(file)
                        .then(() => {
                            resolve();
                        })
                        .catch((error) => {
                            reject(error);
                        });
                });
            },
        };
    },
};
