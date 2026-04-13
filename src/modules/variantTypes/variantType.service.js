const VariantType = require('./variantType.model');

exports.createVariantType = async (variantTypeData, userId) => {
    return await VariantType.create({ ...variantTypeData, createdBy: userId });
};

exports.getVariantTypes = async () => {
    return await VariantType.find().sort({ createdAt: -1 });
};

exports.updateVariantType = async (id, variantTypeData, userId) => {
    const variantType = await VariantType.findByIdAndUpdate(
        id,
        { ...variantTypeData, updatedBy: userId },
        { new: true }
    );
    if (!variantType) throw new Error('Variant Attribute not found');
    return variantType;
};

exports.deleteVariantType = async (id) => {
    const variantType = await VariantType.findById(id);
    if (!variantType) throw new Error('Variant Attribute not found');

    variantType.isDeleted = true;
    await variantType.save();
    return variantType;
};

exports.updateVariantTypeStatus = async (id, status, userId) => {
    const variantType = await VariantType.findByIdAndUpdate(
        id,
        { status, updatedBy: userId },
        { new: true }
    );
    if (!variantType) throw new Error('Variant Attribute not found');
    return variantType;
};
