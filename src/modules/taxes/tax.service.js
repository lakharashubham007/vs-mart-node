const Tax = require('./tax.model');

exports.createTax = async (taxData, userId) => {
    return await Tax.create({ ...taxData, createdBy: userId });
};

exports.getTaxes = async () => {
    return await Tax.find().sort({ createdAt: -1 });
};

exports.updateTax = async (id, taxData, userId) => {
    const tax = await Tax.findByIdAndUpdate(
        id,
        { ...taxData, updatedBy: userId },
        { new: true }
    );
    if (!tax) throw new Error('Tax not found');
    return tax;
};

exports.updateTaxStatus = async (id, status, userId) => {
    const tax = await Tax.findByIdAndUpdate(
        id,
        { status, updatedBy: userId },
        { new: true }
    );
    if (!tax) throw new Error('Tax not found');
    return tax;
};

exports.deleteTax = async (id) => {
    const tax = await Tax.findById(id);
    if (!tax) throw new Error('Tax not found');

    tax.isDeleted = true;
    await tax.save();
    return tax;
};
