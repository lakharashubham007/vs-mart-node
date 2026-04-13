const VariantValue = require('./variantValue.model');
const { sortByUnitValue } = require('../../utils/sorting.util');

exports.createVariantValue = async (variantValueData, userId) => {
    const variantValue = await VariantValue.create({ ...variantValueData, createdBy: userId });
    const variantValues = await exports.getVariantValues(variantValue.variantTypeId);
    return { variantValue, variantValues };
};

exports.getVariantValues = async (variantTypeId) => {
    const filter = { isDeleted: false };
    if (variantTypeId) {
        filter.variantTypeId = variantTypeId;
    }
    const values = await VariantValue.find(filter).sort({ sortOrder: 1, createdAt: -1 });
    return sortByUnitValue(values, (v) => v.name);
};

exports.updateVariantValue = async (id, variantValueData, userId) => {
    const variantValue = await VariantValue.findByIdAndUpdate(
        id,
        { ...variantValueData, updatedBy: userId },
        { new: true }
    );
    if (!variantValue) throw new Error('Variant Value not found');

    const variantValues = await exports.getVariantValues(variantValue.variantTypeId);
    return { variantValue, variantValues };
};

exports.updateVariantValueStatus = async (id, status, userId) => {
    const variantValue = await VariantValue.findByIdAndUpdate(
        id,
        { status, updatedBy: userId },
        { new: true }
    );
    if (!variantValue) throw new Error('Variant Value not found');

    const variantValues = await exports.getVariantValues(variantValue.variantTypeId);
    return { variantValue, variantValues };
};

exports.deleteVariantValue = async (id) => {
    const variantValue = await VariantValue.findById(id);
    if (!variantValue) throw new Error('Variant Value not found');

    const typeId = variantValue.variantTypeId;
    variantValue.isDeleted = true;
    await variantValue.save();

    const variantValues = await exports.getVariantValues(typeId);
    return { variantValue, variantValues };
};
