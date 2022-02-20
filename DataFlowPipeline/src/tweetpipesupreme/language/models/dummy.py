class DummyModel:
    def predict(self, text: str):
        return [['__label__en'],[1.0]]
