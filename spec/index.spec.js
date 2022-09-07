import AnimalApi from '../index'

describe('meson-to', () => {
    it('gets dogs', () => {
        return AnimalApi.getDog()
            .then((animal) => {
                expect(animal.imageSrc).not.toBeUndefined()
                expect(animal.text).toEqual('DOG')
            })
    })

    it('gets cats', () => {
        return AnimalApi.getCat()
            .then((animal) => {
                expect(animal.imageSrc).not.toBeUndefined()
                expect(animal.text).toEqual('CAT')
            })
    })

    it('gets goats', () => {
        return AnimalApi.getGoat()
            .then((animal) => {
                expect(animal.imageSrc).not.toBeUndefined()
                expect(animal.text).toEqual('GOAT')
            })
    })
})