const Support = require('./support.model');

class SupportService {
    async createSupport(data) {
        const support = new Support(data);
        return await support.save();
    }

    async getAllSupport() {
        return await Support.find().sort({ displayOrder: 1 });
    }

    async getActiveSupport() {
        return await Support.find({ isActive: true }).sort({ displayOrder: 1 });
    }

    async getSupportById(id) {
        return await Support.findById(id);
    }

    async updateSupport(id, data) {
        return await Support.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteSupport(id) {
        return await Support.findByIdAndDelete(id);
    }

    async changeSupportStatus(id, isActive) {
        return await Support.findByIdAndUpdate(id, { isActive }, { new: true });
    }
}

module.exports = new SupportService();
