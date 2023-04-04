const pinataSDK = require("@pinata/sdk")
const fs = require("fs")
const path = require("path")
require("dotenv").config()

const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY)

async function storeImagesWithPath(imageFilePath) {
    pinata
        .pinFromFS(imageFilePath)
        .then((result) => {
            //handle results here
            console.log(result)
        })
        // get each image's hash
        .then((result) => {
            const imageHashes = result.map((image) => image.IpfsHash)
            console.log(imageHashes)
            return imageHashes
        })
        .catch((err) => {
            //handle error here
            console.log(err)
        })
}

// 存储图片到IPFS，返回图片的hash
async function storeImages(imagesFilePath) {
    const fullImagesPath = path.resolve(imagesFilePath)

    // Filter the files in case the are a file that in not a .png
    const files = fs.readdirSync(fullImagesPath).filter((file) => file.includes(".png"))

    let responses = []
    console.log("Uploading to IPFS")

    for (const fileIndex in files) {
        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`)
        const options = {
            pinataMetadata: {
                name: files[fileIndex]
            }
        }
        try {
            await pinata
                .pinFileToIPFS(readableStreamForFile, options)
                .then((result) => {
                    responses.push(result)
                })
                .catch((err) => {
                    console.log(err)
                })
        } catch (error) {
            console.log(error)
        }
    }
    return { responses, files }
}

async function storeImagesJson(imagesJson) {
    const josnName = imagesJson.name + ".json"
    const options = {
        pinataMetadata: {
            name: josnName
        }
    }
    try {
        const responses = await pinata.pinJSONToIPFS(imagesJson, options)
        return responses
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    storeImagesWithPath,
    storeImages,
    storeImagesJson
}
