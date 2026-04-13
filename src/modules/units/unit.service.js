const Unit = require('./unit.model');

exports.createUnit = async (unitData, userId) => {
    return await Unit.create({ ...unitData, createdBy: userId });
};

exports.getUnits = async () => {
    return await Unit.find().sort({ createdAt: -1 });
};

exports.updateUnit = async (id, unitData, userId) => {
    const unit = await Unit.findByIdAndUpdate(
        id,
        { ...unitData, updatedBy: userId },
        { new: true }
    );
    if (!unit) throw new Error('Unit not found');
    return unit;
};

exports.deleteUnit = async (id) => {
    const unit = await Unit.findById(id);
    if (!unit) throw new Error('Unit not found');

    unit.isDeleted = true;
    await unit.save();
    return unit;
};

exports.updateUnitStatus = async (id, status, userId) => {
    const unit = await Unit.findByIdAndUpdate(
        id,
        { status, updatedBy: userId },
        { new: true }
    );
    if (!unit) throw new Error('Unit not found');
    return unit;
};
