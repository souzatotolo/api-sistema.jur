const Evento = require('../Models/Evento');

// GET todos os eventos
exports.getAllEventos = async (req, res) => {
  try {
    const eventos = await Evento.find().populate('processoId');
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar eventos', error });
  }
};

// GET evento por ID
exports.getEventoById = async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id).populate('processoId');
    if (!evento) {
      return res.status(404).json({ message: 'Evento não encontrado' });
    }
    res.json(evento);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar evento', error });
  }
};

// GET eventos por processo
exports.getEventosByProcesso = async (req, res) => {
  try {
    const eventos = await Evento.find({
      processoId: req.params.processoId,
    }).populate('processoId');
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar eventos', error });
  }
};

// POST criar novo evento
exports.createEvento = async (req, res) => {
  try {
    const evento = new Evento(req.body);
    const savedEvento = await evento.save();
    const populatedEvento = await savedEvento.populate('processoId');
    res.status(201).json(populatedEvento);
  } catch (error) {
    res.status(400).json({ message: 'Erro ao criar evento', error });
  }
};

// PUT atualizar evento
exports.updateEvento = async (req, res) => {
  try {
    const evento = await Evento.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('processoId');

    if (!evento) {
      return res.status(404).json({ message: 'Evento não encontrado' });
    }

    res.json(evento);
  } catch (error) {
    res.status(400).json({ message: 'Erro ao atualizar evento', error });
  }
};

// DELETE evento
exports.deleteEvento = async (req, res) => {
  try {
    const evento = await Evento.findByIdAndDelete(req.params.id);
    if (!evento) {
      return res.status(404).json({ message: 'Evento não encontrado' });
    }
    res.json({ message: 'Evento deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar evento', error });
  }
};

// GET eventos por intervalo de datas
exports.getEventosPorPeriodo = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    const eventos = await Evento.find({
      dataInicio: {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim),
      },
    }).populate('processoId');
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar eventos', error });
  }
};
